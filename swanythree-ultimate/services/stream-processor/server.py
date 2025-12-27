"""
Stream Processor Service
Handles WebSocket streaming and real-time stream processing
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Set
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Redis client
redis_client: redis.Redis | None = None

# Active connections per stream
active_connections: Dict[str, Set[WebSocket]] = {}


class StreamStats(BaseModel):
    stream_id: str
    viewers: int
    bitrate: float = 0
    fps: float = 0
    resolution: str = ""
    timestamp: str


class StreamEvent(BaseModel):
    stream_id: str
    event_type: str
    data: dict


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global redis_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    yield
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="SwanyThree Stream Processor",
    description="WebSocket streaming and real-time stream processing",
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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    redis_status = "unknown"
    try:
        if redis_client:
            await redis_client.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    return {
        "status": "healthy",
        "service": "stream-processor",
        "timestamp": datetime.utcnow().isoformat(),
        "redis": redis_status,
    }


@app.websocket("/ws/stream/{stream_id}")
async def stream_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket endpoint for stream data."""
    await websocket.accept()

    # Add to active connections
    if stream_id not in active_connections:
        active_connections[stream_id] = set()
    active_connections[stream_id].add(websocket)

    # Update viewer count in Redis
    if redis_client:
        await redis_client.hincrby(f"stream:{stream_id}:viewers", "count", 1)

    try:
        while True:
            # Receive stream data
            data = await websocket.receive_bytes()

            # Process stream data (in production, this would handle video encoding)
            await process_stream_data(stream_id, data)

            # Broadcast to other viewers
            await broadcast_to_stream(stream_id, data, exclude=websocket)

    except WebSocketDisconnect:
        # Remove from active connections
        active_connections[stream_id].discard(websocket)
        if not active_connections[stream_id]:
            del active_connections[stream_id]

        # Update viewer count in Redis
        if redis_client:
            await redis_client.hincrby(f"stream:{stream_id}:viewers", "count", -1)


@app.websocket("/ws/view/{stream_id}")
async def view_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket endpoint for viewers."""
    await websocket.accept()

    # Add to active connections
    if stream_id not in active_connections:
        active_connections[stream_id] = set()
    active_connections[stream_id].add(websocket)

    # Update viewer count
    if redis_client:
        await redis_client.hincrby(f"stream:{stream_id}:viewers", "count", 1)
        viewer_count = await redis_client.hget(f"stream:{stream_id}:viewers", "count")

        # Broadcast viewer count update
        await broadcast_event(stream_id, {
            "type": "viewer_count",
            "count": int(viewer_count or 0),
        })

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove from active connections
        active_connections[stream_id].discard(websocket)
        if not active_connections[stream_id]:
            del active_connections[stream_id]

        # Update viewer count
        if redis_client:
            await redis_client.hincrby(f"stream:{stream_id}:viewers", "count", -1)
            viewer_count = await redis_client.hget(f"stream:{stream_id}:viewers", "count")

            if stream_id in active_connections:
                await broadcast_event(stream_id, {
                    "type": "viewer_count",
                    "count": max(0, int(viewer_count or 0)),
                })


async def process_stream_data(stream_id: str, data: bytes):
    """Process incoming stream data."""
    # In production, this would:
    # 1. Decode video frames
    # 2. Transcode to HLS
    # 3. Update stream metadata
    # 4. Store in Redis for quick access

    if redis_client:
        # Update stream last active timestamp
        await redis_client.hset(
            f"stream:{stream_id}:meta",
            "last_active",
            datetime.utcnow().isoformat(),
        )

        # Track data received
        await redis_client.hincrby(f"stream:{stream_id}:stats", "bytes_received", len(data))


async def broadcast_to_stream(stream_id: str, data: bytes, exclude: WebSocket = None):
    """Broadcast data to all viewers of a stream."""
    if stream_id not in active_connections:
        return

    for connection in active_connections[stream_id]:
        if connection != exclude:
            try:
                await connection.send_bytes(data)
            except Exception:
                active_connections[stream_id].discard(connection)


async def broadcast_event(stream_id: str, event: dict):
    """Broadcast an event to all viewers of a stream."""
    if stream_id not in active_connections:
        return

    message = json.dumps(event)
    for connection in list(active_connections[stream_id]):
        try:
            await connection.send_text(message)
        except Exception:
            active_connections[stream_id].discard(connection)


@app.get("/streams/{stream_id}/stats")
async def get_stream_stats(stream_id: str):
    """Get current stream statistics."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")

    viewer_count = await redis_client.hget(f"stream:{stream_id}:viewers", "count")
    stats = await redis_client.hgetall(f"stream:{stream_id}:stats")
    meta = await redis_client.hgetall(f"stream:{stream_id}:meta")

    return {
        "stream_id": stream_id,
        "viewers": int(viewer_count or 0),
        "bytes_received": int(stats.get("bytes_received", 0)),
        "last_active": meta.get("last_active"),
    }


@app.post("/streams/{stream_id}/event")
async def send_stream_event(stream_id: str, event: StreamEvent):
    """Send an event to all viewers of a stream."""
    await broadcast_event(stream_id, {
        "type": event.event_type,
        "data": event.data,
    })
    return {"status": "sent"}


@app.get("/active-streams")
async def get_active_streams():
    """Get list of active streams."""
    return {
        "streams": list(active_connections.keys()),
        "total": len(active_connections),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
