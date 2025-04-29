from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import uuid
import os
import subprocess

from app.core.watson_client import transcribe_audio_with_watson
from app.db.models.file import MediaFile
from app.db.database import SessionLocal, get_db

from app.core.dependencies import get_current_user
from app.db.models.user import User
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
    db: Session = Depends(get_db)
):
    # Fixed the syntax error in the function parameters
    
    ext = str(os.path.splitext(file.filename)[1]).lower()
    unique_id = str(uuid.uuid4())
    original_path = os.path.join(UPLOAD_DIR, f"{unique_id}{ext}")

    # Save uploaded file
    content = await file.read()
    with open(original_path, "wb") as f:
        f.write(content)

    # If it's a plain text file, return content directly
    if ext == ".txt":
        text_content = content.decode("utf-8")  # assuming utf-8 encoding
        
        # Save metadata to DB for text files too
        txt_path = original_path
        media = MediaFile(
            username=current_user.username,
            filename=file.filename,
            path=original_path,
            transcription_path=txt_path
        )
        db.add(media)
        db.commit()
        
        return text_content

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
        username=current_user.username,
        filename=file.filename,
        path=original_path,
        transcription_path=txt_path
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return transcription

# Add endpoints for history and video retrieval
@router.get("/api/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all media files for the current user
    media_files = db.query(MediaFile).filter(
        MediaFile.username == current_user.username
    ).order_by(MediaFile.created_at.desc()).all()
    
    result = []
    for media in media_files:
        # Read transcription from file
        try:
            with open(media.transcription_path, "r", encoding="utf-8") as f:
                transcription = f.read()
        except:
            transcription = "Transcription not available"
            
        result.append({
            "id": media.id,
            "filename": media.filename,
            "created_at": media.created_at,
            "transcription": transcription
        })
    
    return result

@router.get("/api/transcriptions/{media_id}")
async def get_transcription(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the media file
    media = db.query(MediaFile).filter(
        MediaFile.id == media_id,
        MediaFile.username == current_user.username
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    # Return the transcription file
    return FileResponse(media.transcription_path)

@router.delete("/api/history/{media_id}")
async def delete_history_item(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the media file
    media = db.query(MediaFile).filter(
        MediaFile.id == media_id,
        MediaFile.username == current_user.username
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete the files
    try:
        if os.path.exists(media.path):
            os.remove(media.path)
        if os.path.exists(media.transcription_path):
            os.remove(media.transcription_path)
    except Exception as e:
        # Log the error but continue with DB deletion
        print(f"Error deleting files: {e}")
    
    # Delete from database
    db.delete(media)
    db.commit()
    
    return {"message": "Item deleted successfully"}

@router.get("/api/videos")
async def get_videos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get video files for the current user
    video_files = db.query(MediaFile).filter(
        MediaFile.username == current_user.username,
        MediaFile.filename.like("%.mp4") | 
        MediaFile.filename.like("%.mov") | 
        MediaFile.filename.like("%.avi") | 
        MediaFile.filename.like("%.mkv")
    ).order_by(MediaFile.created_at.desc()).all()
    
    result = []
    for video in video_files:
        result.append({
            "id": video.id,
            "filename": video.filename,
            "created_at": video.created_at
        })
    
    return result

@router.get("/api/videos/{video_id}")
async def get_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the video file
    video = db.query(MediaFile).filter(
        MediaFile.id == video_id,
        MediaFile.username == current_user.username
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Return the video file
    return FileResponse(video.path)
