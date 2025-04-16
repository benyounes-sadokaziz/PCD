from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.user import router as user_router
from app.api.routes.audio import router as audio_router
app = FastAPI()


app.include_router(audio_router)

app.include_router(user_router)
# Example endpoint
@app.get("/")
def root():
    return {"message": "Hello from FastAPI! yooooooooo"}