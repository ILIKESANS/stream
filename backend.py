# backend.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import random
import os
from typing import List

app = FastAPI(title="Streaming Simulator Backend")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store chat messages (in-memory for simplicity)
chat_history: List[dict] = []

# Endpoint: Upload a video
@app.post("/upload_video")
async def upload_video(file: UploadFile = File(...)):
    save_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"message": "Video uploaded successfully!", "filename": file.filename}

# Endpoint: Get chat messages
@app.get("/chat")
async def get_chat():
    return JSONResponse(chat_history)

# Endpoint: Generate a new chat message (simulating viewers)
@app.post("/chat/generate")
async def generate_chat(username: str = "Viewer"):
    messages = [
        "OMG, so epic!",
        "Bruh, did you see that?",
        "Haha, funny!",
        "No way!",
        "Subscribe now!",
        "This is insane!",
        "Wait, what just happened?",
    ]
    new_message = {
        "username": username,
        "message": random.choice(messages)
    }
    chat_history.append(new_message)
    # Keep only last 50 messages
    if len(chat_history) > 50:
        chat_history.pop(0)
    return new_message

# Endpoint: Clear chat (optional)
@app.post("/chat/clear")
async def clear_chat():
    chat_history.clear()
    return {"message": "Chat cleared."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
