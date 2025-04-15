from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid
import os

from app.core.whisper_client import transcribe_audio
from app.models.file import MediaFile
from app.db.database import SessionLocal

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/transcribe/")
async def transcribe(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Step 1: Save uploaded file
    file_ext = os.path.splitext(file.filename)[1]
    unique_id = str(uuid.uuid4())
    unique_filename = f"{unique_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Step 2: Transcribe audio/video
    transcription = transcribe_audio(file_path)

    # Step 3: Save transcription to a .txt file
    txt_filename = f"{unique_id}.txt"
    txt_path = os.path.join(UPLOAD_DIR, txt_filename)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(transcription)

    # Step 4: Store info in PostgreSQL database
    media = MediaFile(
        filename=file.filename,
        path=file_path,
        transcription_path=txt_path
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Step 5: Return the transcription file
    return FileResponse(txt_path, media_type="text/plain", filename="transcription.txt")
