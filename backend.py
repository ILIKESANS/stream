# backend.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import openai
import firebase_admin
from firebase_admin import credentials, db

# ----------------------------
# CONFIGURATION
# ----------------------------

# OpenAI API
openai.api_key = "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"

# Firebase setup
cred = credentials.Certificate("firebase_key.json")  # Download from Firebase console
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://stream-to-ai-default-rtdb.firebaseio.com/'
})
chat_ref = db.reference("chat")  # chat node in Firebase

# FastAPI app
app = FastAPI(title="Streaming Simulator Backend")

# Allow all origins (for local testing, adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ----------------------------
# HELPERS
# ----------------------------

def generate_ai_chat(file_description: str, username: str = "AIViewer"):
    """
    Generates an AI chat message based on file/video description
    and pushes it to Firebase.
    """
    prompt = f"Create a funny, energetic live-stream chat comment for this video: {file_description}"
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=50
    )
    message = response['choices'][0]['message']['content'].strip()
    
    # Push to Firebase
    chat_ref.push({
        "username": username,
        "message": message
    })
    
    return message

# ----------------------------
# ENDPOINTS
# ----------------------------

@app.post("/upload_video")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file and generate AI chat for it.
    """
    os.makedirs("uploads", exist_ok=True)
    save_path = f"uploads/{file.filename}"
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    # For demo purposes, use filename as video description
    ai_message = generate_ai_chat(f"Video file: {file.filename}")
    
    return {"message": "Video uploaded!", "ai_generated_chat": ai_message}

@app.get("/chat")
async def get_chat():
    """
    Get all chat messages from Firebase.
    """
    return chat_ref.get()

@app.post("/chat/generate")
async def generate_chat(username: str = "AIViewer", description: str = "Generic content"):
    """
    Generate an AI chat message based on a custom description.
    """
    msg = generate_ai_chat(description, username)
    return {"username": username, "message": msg}

@app.post("/chat/clear")
async def clear_chat():
    """
    Clear all chat messages from Firebase.
    """
    chat_ref.delete()
    return {"message": "Chat cleared!"}

# ----------------------------
# RUN
# ----------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
