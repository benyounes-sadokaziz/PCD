from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.sql import select
from app.db.database import Base
from sqlalchemy.dialects.postgresql import ARRAY

class MediaFile(Base):
    __tablename__ = "media_files"
    id = Column(Integer, primary_key=True, index=True,autoincrement=True)
    username = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    transcription_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    video_ids = Column(ARRAY(String))

print(select(MediaFile.id))