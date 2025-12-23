/**
 * Voice Cloning Hook
 * Handles ElevenLabs TTS and voice cloning features
 */

import { useState, useCallback, useRef } from 'react';
import { elevenLabsService, ELEVENLABS_VOICES } from '../services/apiService';
import { useVoiceStore, useAppStore } from '../store/useStore';

export function useVoiceCloning() {
  const {
    voices,
    setVoices,
    selectedVoice,
    selectVoice,
    customVoices,
    addCustomVoice,
    isGenerating,
    setGenerating,
    audioUrl,
    setAudioUrl,
    audioHistory,
    addToAudioHistory,
    voiceSettings,
    updateVoiceSetting
  } = useVoiceStore();

  const { vault, incrementAnalytics, addNotification } = useAppStore();

  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  /**
   * Initialize voices from ElevenLabs
   */
  const initializeVoices = useCallback(async () => {
    if (!vault.elevenlabs) {
      // Use default voices
      setVoices(Object.values(ELEVENLABS_VOICES));
      return;
    }

    const result = await elevenLabsService.getVoices(vault.elevenlabs);

    if (result.success) {
      setVoices(result.voices);
    } else {
      setError(result.error);
      setVoices(Object.values(ELEVENLABS_VOICES));
    }
  }, [vault.elevenlabs, setVoices]);

  /**
   * Generate speech from text
   */
  const generateSpeech = useCallback(async (text, voiceId = null) => {
    if (!vault.elevenlabs) {
      setError('ElevenLabs API key not configured');
      return null;
    }

    if (!text.trim()) {
      setError('No text provided');
      return null;
    }

    const voice = voiceId || selectedVoice?.id || ELEVENLABS_VOICES.rachel.id;

    setGenerating(true);
    setError(null);

    try {
      const result = await elevenLabsService.textToSpeech(
        vault.elevenlabs,
        text,
        voice,
        voiceSettings
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setAudioUrl(result.audioUrl);

      // Add to history
      addToAudioHistory({
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId: voice,
        audioUrl: result.audioUrl,
        duration: null // Will be set when audio loads
      });

      incrementAnalytics('voiceGenerations');
      addNotification({ message: 'Voice generated successfully!', type: 'success' });

      setGenerating(false);
      return result;

    } catch (err) {
      setError(err.message);
      addNotification({ message: `Voice generation failed: ${err.message}`, type: 'error' });
      setGenerating(false);
      return null;
    }
  }, [vault.elevenlabs, selectedVoice, voiceSettings, setGenerating, setAudioUrl, addToAudioHistory, incrementAnalytics, addNotification]);

  /**
   * Clone a new voice from audio samples
   */
  const cloneVoice = useCallback(async (name, audioFiles, description = '') => {
    if (!vault.elevenlabs) {
      setError('ElevenLabs API key not configured');
      return null;
    }

    if (!name || audioFiles.length === 0) {
      setError('Name and audio files required');
      return null;
    }

    setGenerating(true);
    setError(null);

    try {
      const result = await elevenLabsService.cloneVoice(
        vault.elevenlabs,
        name,
        audioFiles,
        description
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const newVoice = {
        id: result.voiceId,
        name,
        description,
        isCustom: true
      };

      addCustomVoice(newVoice);
      addNotification({ message: `Voice "${name}" cloned successfully!`, type: 'success' });

      setGenerating(false);
      return newVoice;

    } catch (err) {
      setError(err.message);
      addNotification({ message: `Voice cloning failed: ${err.message}`, type: 'error' });
      setGenerating(false);
      return null;
    }
  }, [vault.elevenlabs, addCustomVoice, setGenerating, addNotification]);

  /**
   * Play audio
   */
  const playAudio = useCallback((url = null) => {
    const audioSrc = url || audioUrl;
    if (!audioSrc) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(audioSrc);

    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      setError('Failed to play audio');
    };

    audioRef.current.play();
  }, [audioUrl]);

  /**
   * Pause audio
   */
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  /**
   * Stop audio
   */
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  /**
   * Download audio
   */
  const downloadAudio = useCallback((url = null, filename = 'voice') => {
    const audioSrc = url || audioUrl;
    if (!audioSrc) return;

    const a = document.createElement('a');
    a.href = audioSrc;
    a.download = `${filename}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioUrl]);

  /**
   * Get all available voices (built-in + custom)
   */
  const getAllVoices = useCallback(() => {
    return [
      ...voices,
      ...customVoices
    ];
  }, [voices, customVoices]);

  /**
   * Estimate character usage
   */
  const estimateCharacterUsage = useCallback((text) => {
    const characterCount = text.length;
    // ElevenLabs pricing is roughly $0.30 per 1000 characters for pro plan
    const estimatedCost = (characterCount / 1000) * 0.30;

    return {
      characters: characterCount,
      estimatedCost: estimatedCost.toFixed(4),
      estimatedDuration: Math.ceil(characterCount / 150) // Rough estimate: 150 chars per second
    };
  }, []);

  return {
    // State
    voices: getAllVoices(),
    selectedVoice,
    customVoices,
    isGenerating,
    audioUrl,
    audioHistory,
    voiceSettings,
    error,
    isPlaying,

    // Actions
    initializeVoices,
    generateSpeech,
    cloneVoice,
    selectVoice,
    updateVoiceSetting,
    playAudio,
    pauseAudio,
    stopAudio,
    downloadAudio,

    // Utilities
    estimateCharacterUsage,
    defaultVoices: ELEVENLABS_VOICES
  };
}

export default useVoiceCloning;
