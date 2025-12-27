"""
NotebookLM Bridge Service
Handles Gemini synthesis and ElevenLabs TTS for podcast generation
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel
import httpx
import google.generativeai as genai

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")

# Clients
redis_client: redis.Redis | None = None


class Source(BaseModel):
    type: str
    content: str
    title: Optional[str] = None


class SynthesizeRequest(BaseModel):
    notebook_id: str
    sources: List[Source]


class PodcastRequest(BaseModel):
    podcast_id: str
    notebook_id: str
    synthesis: str
    key_insights: List[str] = []
    host_voices: List[Dict[str, str]] = []
    duration: str = "medium"


class ChatRequest(BaseModel):
    notebook_id: str
    message: str
    context: Dict[str, Any] = {}


class SynthesisResult(BaseModel):
    synthesis: str
    summary: str
    key_insights: List[str]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global redis_client

    redis_client = redis.from_url(REDIS_URL, decode_responses=True)

    # Configure Gemini
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)

    yield

    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="SwanyThree NotebookLM Bridge",
    description="Gemini synthesis and ElevenLabs TTS for podcast generation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Duration settings (in approximate words for the podcast script)
DURATION_WORDS = {
    "short": 500,
    "medium": 1500,
    "long": 3000,
}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    redis_status = "unknown"
    gemini_status = "not_configured"
    elevenlabs_status = "not_configured"

    try:
        if redis_client:
            await redis_client.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    if GEMINI_API_KEY:
        gemini_status = "configured"

    if ELEVENLABS_API_KEY:
        elevenlabs_status = "configured"

    return {
        "status": "healthy",
        "service": "notebooklm-bridge",
        "timestamp": datetime.utcnow().isoformat(),
        "redis": redis_status,
        "gemini": gemini_status,
        "elevenlabs": elevenlabs_status,
    }


@app.post("/synthesize")
async def synthesize_sources(request: SynthesizeRequest, background_tasks: BackgroundTasks):
    """Synthesize multiple sources into a coherent summary."""
    background_tasks.add_task(process_synthesis, request)
    return {"status": "processing", "notebook_id": request.notebook_id}


@app.post("/podcast/generate")
async def generate_podcast(request: PodcastRequest, background_tasks: BackgroundTasks):
    """Generate a podcast from notebook synthesis."""
    background_tasks.add_task(process_podcast_generation, request)
    return {"status": "processing", "podcast_id": request.podcast_id}


@app.post("/chat")
async def chat_with_notebook(request: ChatRequest):
    """Chat with notebook content using Gemini."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API not configured")

    try:
        model = genai.GenerativeModel("gemini-pro")

        # Build context from notebook
        context = f"""You are an AI assistant helping users understand the content of their notebook.

Notebook Content:
{request.context.get('synthesis', 'No synthesis available')}

Key Insights:
{json.dumps(request.context.get('keyInsights', []), indent=2)}

Sources:
{json.dumps(request.context.get('sources', []), indent=2)}

Please answer the following question based on the notebook content. If the answer is not in the content, say so."""

        response = model.generate_content(
            f"{context}\n\nUser Question: {request.message}"
        )

        return {
            "response": response.text,
            "sources": extract_relevant_sources(request.context.get('sources', []), request.message),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def process_synthesis(request: SynthesizeRequest):
    """Process source synthesis using Gemini."""
    try:
        if not GEMINI_API_KEY:
            raise ValueError("Gemini API not configured")

        model = genai.GenerativeModel("gemini-pro")

        # Prepare source content
        source_content = "\n\n".join([
            f"Source {i+1} ({s.type}): {s.title or 'Untitled'}\n{s.content}"
            for i, s in enumerate(request.sources)
        ])

        # Generate synthesis
        synthesis_prompt = f"""Analyze and synthesize the following sources into a comprehensive overview.
Create a coherent narrative that connects the key themes and ideas.

Sources:
{source_content}

Please provide:
1. A detailed synthesis (2-3 paragraphs)
2. A brief summary (1 paragraph)
3. 5-7 key insights as bullet points

Format your response as JSON:
{{
    "synthesis": "...",
    "summary": "...",
    "key_insights": ["insight1", "insight2", ...]
}}"""

        response = model.generate_content(synthesis_prompt)

        # Parse response
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {
                    "synthesis": response.text,
                    "summary": response.text[:500],
                    "key_insights": [],
                }

        # Send callback to backend
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BACKEND_URL}/api/notebooklm/callback/synthesis/{request.notebook_id}",
                json=result,
                timeout=10.0,
            )

    except Exception as e:
        # Send error callback
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BACKEND_URL}/api/notebooklm/callback/synthesis/{request.notebook_id}",
                json={"error": str(e)},
                timeout=10.0,
            )


async def process_podcast_generation(request: PodcastRequest):
    """Generate podcast audio from synthesis."""
    try:
        if not GEMINI_API_KEY:
            raise ValueError("Gemini API not configured")

        target_words = DURATION_WORDS.get(request.duration, 1500)

        # Generate podcast script using Gemini
        model = genai.GenerativeModel("gemini-pro")

        script_prompt = f"""Create an engaging podcast script for two hosts discussing the following content.
The podcast should be approximately {target_words} words.

Content Summary:
{request.synthesis}

Key Points to Cover:
{json.dumps(request.key_insights, indent=2)}

Format the script as a natural conversation between two hosts (Host A and Host B).
Include:
- An engaging introduction
- Discussion of main points with examples
- Interesting tangents and personal insights
- A conclusion with key takeaways

Format each line as:
HOST_A: [dialogue]
HOST_B: [dialogue]"""

        response = model.generate_content(script_prompt)
        script = response.text

        # Generate audio using ElevenLabs (or placeholder)
        audio_url = None
        duration = 0

        if ELEVENLABS_API_KEY:
            audio_url, duration = await generate_audio_elevenlabs(script, request.host_voices)
        else:
            # Estimate duration based on word count (150 words per minute)
            word_count = len(script.split())
            duration = int((word_count / 150) * 60)

        # Send callback to backend
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BACKEND_URL}/api/notebooklm/callback/podcast/{request.podcast_id}",
                json={
                    "status": "completed",
                    "script": script,
                    "audio_url": audio_url,
                    "duration": duration,
                },
                timeout=10.0,
            )

    except Exception as e:
        # Send error callback
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BACKEND_URL}/api/notebooklm/callback/podcast/{request.podcast_id}",
                json={
                    "status": "failed",
                    "error": str(e),
                },
                timeout=10.0,
            )


async def generate_audio_elevenlabs(script: str, host_voices: List[Dict[str, str]]) -> tuple[str, int]:
    """Generate audio using ElevenLabs API."""
    # Default voices if not specified
    voices = host_voices or [
        {"name": "Host A", "voiceId": "21m00Tcm4TlvDq8ikWAM"},  # Rachel
        {"name": "Host B", "voiceId": "AZnzlk1XvdvUeBnXmlld"},  # Domi
    ]

    # Parse script into dialogue lines
    lines = []
    current_speaker = None

    for line in script.split("\n"):
        line = line.strip()
        if line.startswith("HOST_A:"):
            current_speaker = 0
            lines.append({"speaker": 0, "text": line.replace("HOST_A:", "").strip()})
        elif line.startswith("HOST_B:"):
            current_speaker = 1
            lines.append({"speaker": 1, "text": line.replace("HOST_B:", "").strip()})
        elif current_speaker is not None and line:
            lines[-1]["text"] += " " + line

    # Generate audio for each line and concatenate
    # This is a simplified version - production would use proper audio concatenation
    audio_segments = []
    total_duration = 0

    async with httpx.AsyncClient() as client:
        for line in lines:
            voice_id = voices[line["speaker"]]["voiceId"]

            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": line["text"],
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
                timeout=60.0,
            )

            if response.status_code == 200:
                audio_segments.append(response.content)
                # Estimate duration (about 150 words per minute)
                total_duration += len(line["text"].split()) / 150 * 60

    # For now, return placeholder - production would upload to S3
    # and return the combined audio URL
    return None, int(total_duration)


def extract_relevant_sources(sources: List[Dict], query: str) -> List[str]:
    """Extract sources relevant to the query."""
    # Simple keyword matching - production would use embeddings
    query_words = set(query.lower().split())
    relevant = []

    for i, source in enumerate(sources):
        content = source.get("content", "").lower()
        title = source.get("title", f"Source {i+1}")

        # Check for keyword overlap
        content_words = set(content.split())
        overlap = query_words.intersection(content_words)

        if len(overlap) > 0:
            relevant.append(title)

    return relevant[:3]  # Return top 3 relevant sources


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)
