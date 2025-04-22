from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

# Import your existing routers
from app.api.routes import user, audio
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.file import MediaFile
from app.db.models.user import User

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import os

app = FastAPI()


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[""],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/css", StaticFiles(directory="front_js/css"), name="css")
app.mount("/js", StaticFiles(directory="front_js/js"), name="js")
app.mount("/assets", StaticFiles(directory="front_js/assets"), name="assets")
app.mount("/pages", StaticFiles(directory="front_js/pages"), name="pages")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    return FileResponse("front_js/index.html")

# Serve other HTML pages directly
@app.get("/login", response_class=HTMLResponse)
async def read_login():
    return FileResponse("front_js/pages/login.html")

@app.get("/register", response_class=HTMLResponse)
async def read_register():
    return FileResponse("front_js/pages/register.html")

@app.get("/home", response_class=HTMLResponse)
async def read_home():
    return FileResponse("front_js/pages/home.html")

@app.get("/history", response_class=HTMLResponse)
async def read_history():
    return FileResponse("front_js/pages/history.html")

# Include your existing routers
app.include_router(user.router)
app.include_router(audio.router)



# Add new endpoints for the Angular frontend

@app.get("/validate_token")
async def validate_token(current_user: User = Depends(get_current_user)):
    return {"valid": True}
@app.get("/")
async def root():
    return {"message": "Welcome to the Transcription API"}




