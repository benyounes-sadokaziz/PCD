from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import os
import subprocess

from app.core.watson_client import transcribe_audio_with_watson
from app.db.models.file import MediaFile
from app.db.database import SessionLocal

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.database import get_db
from fastapi.responses import FileResponse

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)



def extract_audio(video_path: str, audio_path: str) -> bool:
    try:
        subprocess.run([
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "mp3", audio_path
        ], check=True)
        return True
    except subprocess.CalledProcessError:
        return False

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),  
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) ):
    ext = os.path.splitext(file.filename)[1].lower()
    unique_id = str(uuid.uuid4())
    original_path = os.path.join(UPLOAD_DIR, f"{unique_id}{ext}")

    # Save uploaded file
    with open(original_path, "wb") as f:
        f.write(await file.read())

    # Determine if file is audio or video
    if ext in [".mp4", ".mov", ".avi", ".mkv"]:
        # Extract audio from video
        audio_path = os.path.join(UPLOAD_DIR, f"{unique_id}.mp3")
        if not extract_audio(original_path, audio_path):
            raise HTTPException(status_code=500, detail="Failed to extract audio from video")
    elif ext in [".mp3", ".wav", ".ogg"]:
        audio_path = original_path
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Transcribe
    transcription = transcribe_audio_with_watson(audio_path)

    # Save transcription
    txt_path = os.path.join(UPLOAD_DIR, f"{unique_id}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(transcription)

    # Save metadata to DB
    media = MediaFile(
        user_id=current_user.id,
        filename=file.filename,
        path=original_path,
        transcription_path=txt_path
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return transcription