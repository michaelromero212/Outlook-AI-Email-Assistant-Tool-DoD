from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from routes import emails, ai

app = FastAPI(
    title="Outlook-AI-Email-Assistant-Tool-DoD API",
    description="AI-powered email analysis for government contractors",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emails.router, prefix="/api/emails", tags=["emails"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "Outlook-AI-Email-Assistant-Tool-DoD", "version": "1.0.0"}
