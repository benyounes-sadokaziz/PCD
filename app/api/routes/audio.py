from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
import os
import subprocess
from typing import List, Optional
from pydantic import BaseModel

from app.core.watson_client import transcribe_audio_with_watson
from app.db.models.file import MediaFile
from app.db.database import SessionLocal, get_db
from app.api.routes.NLP import NLP

from app.core.dependencies import get_current_user
from app.db.models.user import User
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter()

FFMPEG_PATH = "C:/Users/sadok/Downloads/ffmpeg-7.1.1-essentials_build/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe"

UPLOAD_DIR = "uploads"
VIDEO_DIR = "videos"  # Directory for video files
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

# Model for video IDs response
class VideoIdsResponse(BaseModel):
    video_ids: List[str]

def extract_audio(video_path: str, audio_path: str) -> bool:
    try:
        subprocess.run([
            FFMPEG_PATH, "-y",  # overwrite output if exists
            "-i", video_path,
            "-vn",  # no video
            "-acodec", "libmp3lame",  # explicitly use mp3 encoder
            audio_path
        ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError as e:
        print("Error:", e.stderr.decode())  # pour voir l'erreur exacte
        return False

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Generate a unique ID for this transcription
    transcription_id = str(uuid.uuid4())
    
    ext = str(os.path.splitext(file.filename)[1]).lower()
    unique_id = transcription_id
    original_path = os.path.join(UPLOAD_DIR, f"{unique_id}{ext}")

    # Save uploaded file
    content = await file.read()
    with open(original_path, "wb") as f:
        f.write(content)

    # If it's a plain text file, return content directly
    if ext == ".txt":
        text_content = content.decode("utf-8")  # assuming utf-8 encoding
        
        # Extract video IDs using NLP
        video_ids = NLP(text_content)
        
        # Save metadata to DB for text files too
        txt_path = original_path
        media = MediaFile(
            username=current_user.username,
            filename=file.filename,
            path=original_path,
            transcription_path=txt_path,
            video_ids=video_ids
        )
        db.add(media)
        db.commit()
        
        # Return response in the format expected by the frontend
        return  text_content

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
    
    # Extract video IDs using NLP
    video_ids = NLP(transcription)

    # Save transcription
    txt_path = os.path.join(UPLOAD_DIR, f"{unique_id}.txt") 
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(transcription)

    # Save metadata to DB
    media = MediaFile(
        username=current_user.username,
        filename=file.filename,
        path=original_path,
        transcription_path=txt_path,
        video_ids=video_ids
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Return response in the format expected by the frontend
    return  transcription


@router.get("/api/get_video_ids", response_model=list)
async def get_video_ids(
    
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get video IDs associated with a transcription.
    """
    
    try:
        #print(f"Looking for transcription ID: {transcription_id}")
        print(f"Current user: {current_user.username}")
        
        # Query the database for the media file
        media_file = db.query(MediaFile)\
    .filter(
        MediaFile.username == current_user.username  # Keep this if you need user filtering
    )\
    .order_by(MediaFile.created_at.desc())\
    .first()
        
        if not media_file:
            #print(f"No media file found for ID: {transcription_id} and user: {current_user.username}")
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        print(f"Found media file: {media_file.id}, video_ids: {media_file.video_ids}")
        
        # Return the video IDs
        return media_file.video_ids
    
    except Exception as e:
        print(f"Error in get_video_ids: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    


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
            "transcription": transcription,
            "video_count": len(media.video_ids) if media.video_ids else 0
        })
    
    return result

@router.get("/api/transcriptions/{media_id}")
async def get_transcription(
    media_id: str,
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
    media_id: str,
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

@router.get("/videos/{video_id}")
async def get_video(
    video_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Serve a video file by its ID.
    """
    # Construct the path to the video file
    video_path = os.path.join(VIDEO_DIR, video_id)
    
    # Check if the file exists
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Return the video file
    return FileResponse(
        video_path, 
        media_type="video/mp4",  # Adjust based on actual video format
        filename=f"video_{video_id}"
    )
