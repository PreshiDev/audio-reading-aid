import { useState, useRef, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [totalTime, setTotalTime] = useState("0:00");
  const [progress, setProgress] = useState(0);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const estimateReadingTime = useCallback((text: string) => {
    // Estimate reading time based on average speaking rate (150-200 words per minute)
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 150 / playbackSpeed;
    return (words / wordsPerMinute) * 60; // Convert to seconds
  }, [playbackSpeed]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackSpeed;
      utterance.pitch = 1;
      utterance.volume = 1;

      const estimatedDuration = estimateReadingTime(text);
      setTotalTime(formatTime(estimatedDuration));
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        setCurrentTime(totalTime);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        setCurrentTime("0:00");
      };

      // Update progress during playback
      const updateProgress = () => {
        if (utteranceRef.current && isPlaying && !isPaused) {
          const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000;
          const progressPercent = Math.min((elapsed / estimatedDuration) * 100, 100);
          setProgress(progressPercent);
          setCurrentTime(formatTime(elapsed));
          
          if (progressPercent < 100) {
            requestAnimationFrame(updateProgress);
          }
        }
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      requestAnimationFrame(updateProgress);
    } else {
      alert('Speech synthesis not supported in this browser.');
    }
  }, [playbackSpeed, estimateReadingTime, formatTime, totalTime, isPlaying, isPaused]);

  const pause = useCallback(() => {
    if ('speechSynthesis' in window && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setIsPaused(true);
      pausedTimeRef.current += Date.now() - startTimeRef.current;
    }
  }, []);

  const resume = useCallback(() => {
    if ('speechSynthesis' in window && speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now();
    }
  }, []);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setCurrentTime("0:00");
      setTotalTime("0:00");
      pausedTimeRef.current = 0;
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    
    // If currently playing, restart with new speed
    if (utteranceRef.current && isPlaying) {
      const currentText = utteranceRef.current.text;
      stop();
      setTimeout(() => speak(currentText), 100);
    }
  }, [isPlaying, speak, stop]);

  return {
    isPlaying,
    isPaused,
    playbackSpeed,
    currentTime,
    totalTime,
    progress,
    speak,
    pause,
    resume,
    stop,
    setSpeed,
  };
}
