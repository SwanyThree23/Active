/**
 * Media Recorder Hook
 * Handles video/audio recording for live streaming
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useStore';

export function useMediaRecorder(options = {}) {
  const {
    video = true,
    audio = true,
    mimeType = 'video/webm;codecs=vp9',
    videoBitsPerSecond = 2500000
  } = options;

  const { startRecording: storeStartRecording, stopRecording: storeStopRecording } = useAppStore();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  /**
   * Get user media stream
   */
  const getMediaStream = useCallback(async () => {
    try {
      const constraints = {
        video: video ? {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      setError(`Failed to access media devices: ${err.message}`);
      return null;
    }
  }, [video, audio]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    setError(null);
    setRecordedChunks([]);

    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await getMediaStream();
        if (!stream) return false;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
        videoBitsPerSecond
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
      };

      mediaRecorder.onstop = () => {
        clearInterval(durationIntervalRef.current);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      storeStartRecording();

      // Update duration
      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);

      return true;
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      return false;
    }
  }, [getMediaStream, mimeType, videoBitsPerSecond, storeStartRecording]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    clearInterval(durationIntervalRef.current);

    setIsRecording(false);
    setIsPaused(false);
    storeStopRecording();
  }, [storeStopRecording]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  /**
   * Get recorded blob
   */
  const getRecordedBlob = useCallback(() => {
    if (recordedChunks.length === 0) return null;

    const blob = new Blob(recordedChunks, { type: mimeType });
    return blob;
  }, [recordedChunks, mimeType]);

  /**
   * Generate preview URL
   */
  const generatePreview = useCallback(() => {
    const blob = getRecordedBlob();
    if (!blob) return null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return url;
  }, [getRecordedBlob, previewUrl]);

  /**
   * Download recorded video
   */
  const downloadRecording = useCallback((filename = 'recording') => {
    const blob = getRecordedBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getRecordedBlob]);

  /**
   * Format duration as HH:MM:SS
   */
  const formatDuration = useCallback((ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0')
    ].join(':');
  }, []);

  return {
    // State
    isRecording,
    isPaused,
    error,
    duration,
    formattedDuration: formatDuration(duration),
    previewUrl,
    recordedChunks,

    // Refs
    videoPreviewRef,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getRecordedBlob,
    generatePreview,
    downloadRecording,
    getMediaStream
  };
}

export default useMediaRecorder;
