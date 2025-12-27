"""
Agent Orchestrator Service
Handles AI task routing and execution using Claude Sonnet 4
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel
import httpx
from anthropic import AsyncAnthropic

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")

# Clients
redis_client: redis.Redis | None = None
anthropic_client: AsyncAnthropic | None = None


class AgentType(str, Enum):
    MODERATION = "moderation"
    HIGHLIGHTS = "highlights"
    ANALYTICS = "analytics"
    SUMMARY = "summary"
    SENTIMENT = "sentiment"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskRequest(BaseModel):
    task_id: str
    agent_type: AgentType
    task_type: str
    input: Dict[str, Any] = {}
    priority: int = 0


class TaskResult(BaseModel):
    task_id: str
    status: TaskStatus
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global redis_client, anthropic_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    if ANTHROPIC_API_KEY:
        anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    yield
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="SwanyThree Agent Orchestrator",
    description="AI task routing and execution with Claude Sonnet 4",
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

# Agent system prompts
AGENT_PROMPTS = {
    AgentType.MODERATION: """You are a content moderation AI for a live streaming platform.
Analyze the provided content and determine if it violates community guidelines.
Categories to check: hate speech, harassment, spam, explicit content, misinformation.
Return a JSON object with: { "is_violation": boolean, "category": string, "confidence": float, "reason": string }""",

    AgentType.HIGHLIGHTS: """You are a stream highlights AI.
Analyze the provided stream data and identify key moments worth highlighting.
Look for: exciting moments, funny moments, viewer engagement spikes, important announcements.
Return a JSON object with: { "highlights": [{ "timestamp": string, "type": string, "description": string, "score": float }] }""",

    AgentType.ANALYTICS: """You are a stream analytics AI.
Analyze the provided stream data and generate insights.
Focus on: viewer trends, engagement patterns, chat activity, peak moments.
Return a JSON object with: { "insights": [string], "recommendations": [string], "summary": string }""",

    AgentType.SUMMARY: """You are a content summarization AI.
Summarize the provided stream or chat content concisely.
Include key topics discussed, important moments, and overall sentiment.
Return a JSON object with: { "summary": string, "topics": [string], "duration": string }""",

    AgentType.SENTIMENT: """You are a sentiment analysis AI.
Analyze the sentiment of the provided chat messages.
Return a JSON object with: { "overall_sentiment": float (-1 to 1), "positive_ratio": float, "negative_ratio": float, "neutral_ratio": float, "key_emotions": [string] }""",
}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    redis_status = "unknown"
    anthropic_status = "unknown"

    try:
        if redis_client:
            await redis_client.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    if anthropic_client:
        anthropic_status = "configured"
    else:
        anthropic_status = "not_configured"

    return {
        "status": "healthy",
        "service": "agent-orchestrator",
        "timestamp": datetime.utcnow().isoformat(),
        "redis": redis_status,
        "anthropic": anthropic_status,
    }


@app.post("/tasks")
async def create_task(task: TaskRequest, background_tasks: BackgroundTasks):
    """Create and execute a new AI task."""
    # Store task in Redis
    if redis_client:
        await redis_client.hset(
            f"task:{task.task_id}",
            mapping={
                "status": TaskStatus.PROCESSING.value,
                "agent_type": task.agent_type.value,
                "task_type": task.task_type,
                "input": json.dumps(task.input),
                "created_at": datetime.utcnow().isoformat(),
            },
        )

    # Execute task in background
    background_tasks.add_task(execute_task, task)

    return {"status": "accepted", "task_id": task.task_id}


@app.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a pending task."""
    if redis_client:
        status = await redis_client.hget(f"task:{task_id}", "status")
        if status == TaskStatus.PROCESSING.value:
            await redis_client.hset(f"task:{task_id}", "status", TaskStatus.FAILED.value)
            await redis_client.hset(f"task:{task_id}", "error", "Cancelled by user")
            return {"status": "cancelled"}

    return {"status": "not_found"}


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task status and result."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")

    task_data = await redis_client.hgetall(f"task:{task_id}")
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task_id,
        "status": task_data.get("status"),
        "agent_type": task_data.get("agent_type"),
        "output": json.loads(task_data.get("output", "null")),
        "error": task_data.get("error"),
        "created_at": task_data.get("created_at"),
        "completed_at": task_data.get("completed_at"),
    }


async def execute_task(task: TaskRequest):
    """Execute an AI task using Claude."""
    try:
        if not anthropic_client:
            raise ValueError("Anthropic client not configured")

        # Get the appropriate system prompt
        system_prompt = AGENT_PROMPTS.get(task.agent_type, "You are a helpful AI assistant.")

        # Build the user message
        user_message = f"Task type: {task.task_type}\n\nInput data:\n{json.dumps(task.input, indent=2)}"

        # Call Claude API
        response = await anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ],
        )

        # Parse response
        response_text = response.content[0].text

        # Try to parse as JSON
        try:
            output = json.loads(response_text)
        except json.JSONDecodeError:
            output = {"raw_response": response_text}

        # Update task status
        if redis_client:
            await redis_client.hset(
                f"task:{task.task_id}",
                mapping={
                    "status": TaskStatus.COMPLETED.value,
                    "output": json.dumps(output),
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )

        # Send callback to backend
        await send_callback(task.task_id, TaskStatus.COMPLETED, output)

    except Exception as e:
        error_msg = str(e)

        if redis_client:
            await redis_client.hset(
                f"task:{task.task_id}",
                mapping={
                    "status": TaskStatus.FAILED.value,
                    "error": error_msg,
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )

        # Send error callback
        await send_callback(task.task_id, TaskStatus.FAILED, None, error_msg)


async def send_callback(task_id: str, status: TaskStatus, output: Any = None, error: str = None):
    """Send task completion callback to backend."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BACKEND_URL}/api/agents/task/{task_id}/callback",
                json={
                    "status": status.value,
                    "output": output,
                    "error": error,
                },
                timeout=10.0,
            )
    except Exception as e:
        print(f"Failed to send callback for task {task_id}: {e}")


@app.get("/agents")
async def list_agents():
    """List available agent types."""
    return {
        "agents": [
            {
                "type": agent.value,
                "name": agent.name.replace("_", " ").title(),
                "description": AGENT_PROMPTS[agent].split("\n")[0],
            }
            for agent in AgentType
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
