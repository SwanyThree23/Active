"""
Video Processor Service
Handles FFmpeg transcoding, HLS generation, and S3 upload
"""

import asyncio
import json
import os
import uuid
import subprocess
from datetime import datetime
from typing import Optional
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
import aiofiles

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
S3_BUCKET = os.getenv("S3_BUCKET", "swanythree-videos")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TEMP_DIR = "/tmp/video-processor"

# Clients
redis_client: redis.Redis | None = None
s3_client = None


class TranscodeRequest(BaseModel):
    video_id: str
    input_url: str
    output_formats: list[str] = ["hls"]
    quality_levels: list[str] = ["720p", "480p", "360p"]


class ThumbnailRequest(BaseModel):
    video_id: str
    video_url: str
    timestamp: float = 0


class ProcessingJob(BaseModel):
    job_id: str
    video_id: str
    status: str
    progress: float = 0
    output_url: Optional[str] = None
    error: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global redis_client, s3_client

    # Create temp directory
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Initialize Redis
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)

    # Initialize S3 client
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )

    yield

    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="SwanyThree Video Processor",
    description="FFmpeg transcoding, HLS generation, and S3 upload",
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

# Quality presets
QUALITY_PRESETS = {
    "1080p": {"width": 1920, "height": 1080, "bitrate": "5000k", "audio_bitrate": "192k"},
    "720p": {"width": 1280, "height": 720, "bitrate": "2500k", "audio_bitrate": "128k"},
    "480p": {"width": 854, "height": 480, "bitrate": "1000k", "audio_bitrate": "96k"},
    "360p": {"width": 640, "height": 360, "bitrate": "500k", "audio_bitrate": "64k"},
}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    redis_status = "unknown"
    s3_status = "unknown"
    ffmpeg_status = "unknown"

    try:
        if redis_client:
            await redis_client.ping()
            redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    try:
        if s3_client:
            s3_client.head_bucket(Bucket=S3_BUCKET)
            s3_status = "connected"
        else:
            s3_status = "not_configured"
    except ClientError:
        s3_status = "bucket_not_found"
    except Exception:
        s3_status = "error"

    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        ffmpeg_status = "available" if result.returncode == 0 else "error"
    except Exception:
        ffmpeg_status = "not_installed"

    return {
        "status": "healthy",
        "service": "video-processor",
        "timestamp": datetime.utcnow().isoformat(),
        "redis": redis_status,
        "s3": s3_status,
        "ffmpeg": ffmpeg_status,
    }


@app.post("/transcode")
async def transcode_video(request: TranscodeRequest, background_tasks: BackgroundTasks):
    """Start video transcoding job."""
    job_id = str(uuid.uuid4())

    # Store job in Redis
    if redis_client:
        await redis_client.hset(
            f"job:{job_id}",
            mapping={
                "video_id": request.video_id,
                "status": "pending",
                "progress": 0,
                "created_at": datetime.utcnow().isoformat(),
            },
        )

    # Start transcoding in background
    background_tasks.add_task(
        process_transcode,
        job_id,
        request.video_id,
        request.input_url,
        request.quality_levels,
    )

    return {"job_id": job_id, "status": "accepted"}


@app.post("/thumbnail")
async def generate_thumbnail(request: ThumbnailRequest, background_tasks: BackgroundTasks):
    """Generate video thumbnail."""
    job_id = str(uuid.uuid4())

    # Store job in Redis
    if redis_client:
        await redis_client.hset(
            f"job:{job_id}",
            mapping={
                "video_id": request.video_id,
                "type": "thumbnail",
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
            },
        )

    # Generate thumbnail in background
    background_tasks.add_task(
        process_thumbnail,
        job_id,
        request.video_id,
        request.video_url,
        request.timestamp,
    )

    return {"job_id": job_id, "status": "accepted"}


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get job status."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not available")

    job_data = await redis_client.hgetall(f"job:{job_id}")
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    return ProcessingJob(
        job_id=job_id,
        video_id=job_data.get("video_id", ""),
        status=job_data.get("status", "unknown"),
        progress=float(job_data.get("progress", 0)),
        output_url=job_data.get("output_url"),
        error=job_data.get("error"),
    )


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload video file directly."""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3 not configured")

    video_id = str(uuid.uuid4())
    file_ext = Path(file.filename or "video.mp4").suffix
    s3_key = f"uploads/{video_id}{file_ext}"

    try:
        # Stream upload to S3
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": file.content_type or "video/mp4"},
        )

        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        return {
            "video_id": video_id,
            "url": s3_url,
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def process_transcode(job_id: str, video_id: str, input_url: str, quality_levels: list[str]):
    """Process video transcoding to HLS."""
    try:
        # Update status
        if redis_client:
            await redis_client.hset(f"job:{job_id}", "status", "processing")

        output_dir = f"{TEMP_DIR}/{video_id}"
        os.makedirs(output_dir, exist_ok=True)

        # Build FFmpeg command for HLS
        master_playlist = f"{output_dir}/index.m3u8"

        for i, quality in enumerate(quality_levels):
            preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["720p"])
            progress = (i / len(quality_levels)) * 100

            if redis_client:
                await redis_client.hset(f"job:{job_id}", "progress", progress)

            output_path = f"{output_dir}/{quality}/index.m3u8"
            os.makedirs(f"{output_dir}/{quality}", exist_ok=True)

            cmd = [
                "ffmpeg", "-i", input_url,
                "-c:v", "libx264", "-preset", "fast",
                "-vf", f"scale={preset['width']}:{preset['height']}",
                "-b:v", preset["bitrate"],
                "-c:a", "aac", "-b:a", preset["audio_bitrate"],
                "-hls_time", "6", "-hls_list_size", "0",
                "-hls_segment_filename", f"{output_dir}/{quality}/segment_%03d.ts",
                "-f", "hls", output_path,
                "-y",
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.wait()

        # Create master playlist
        with open(master_playlist, "w") as f:
            f.write("#EXTM3U\n")
            for quality in quality_levels:
                preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["720p"])
                f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={int(preset['bitrate'][:-1]) * 1000},RESOLUTION={preset['width']}x{preset['height']}\n")
                f.write(f"{quality}/index.m3u8\n")

        # Upload to S3
        s3_key_base = f"hls/{video_id}"
        if s3_client:
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    local_path = os.path.join(root, file)
                    relative_path = os.path.relpath(local_path, output_dir)
                    s3_key = f"{s3_key_base}/{relative_path}"

                    content_type = "application/x-mpegURL" if file.endswith(".m3u8") else "video/MP2T"
                    s3_client.upload_file(
                        local_path, S3_BUCKET, s3_key,
                        ExtraArgs={"ContentType": content_type},
                    )

        output_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key_base}/index.m3u8"

        # Update job status
        if redis_client:
            await redis_client.hset(
                f"job:{job_id}",
                mapping={
                    "status": "completed",
                    "progress": 100,
                    "output_url": output_url,
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )

        # Cleanup temp files
        import shutil
        shutil.rmtree(output_dir, ignore_errors=True)

    except Exception as e:
        if redis_client:
            await redis_client.hset(
                f"job:{job_id}",
                mapping={
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )


async def process_thumbnail(job_id: str, video_id: str, video_url: str, timestamp: float):
    """Generate video thumbnail."""
    try:
        if redis_client:
            await redis_client.hset(f"job:{job_id}", "status", "processing")

        output_path = f"{TEMP_DIR}/{video_id}_thumb.jpg"

        cmd = [
            "ffmpeg", "-ss", str(timestamp),
            "-i", video_url,
            "-vframes", "1",
            "-vf", "scale=640:360",
            "-y", output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.wait()

        # Upload to S3
        s3_key = f"thumbnails/{video_id}.jpg"
        if s3_client and os.path.exists(output_path):
            s3_client.upload_file(
                output_path, S3_BUCKET, s3_key,
                ExtraArgs={"ContentType": "image/jpeg"},
            )

        output_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        if redis_client:
            await redis_client.hset(
                f"job:{job_id}",
                mapping={
                    "status": "completed",
                    "progress": 100,
                    "output_url": output_url,
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )

        # Cleanup
        if os.path.exists(output_path):
            os.remove(output_path)

    except Exception as e:
        if redis_client:
            await redis_client.hset(
                f"job:{job_id}",
                mapping={
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat(),
                },
            )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
