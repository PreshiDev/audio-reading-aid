import { Clock, SkipBack, Play, Pause, SkipForward, Square, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useCallback } from "react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  currentTime: string;
  totalTime: string;
  progress: number;
  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onSpeedChange?: (speed: number) => void;
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
  currentVoice: SpeechSynthesisVoice | null;
}

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
}

export default function PlaybackControls({
  isPlaying,
  isPaused,
  playbackSpeed,
  currentTime,
  totalTime,
  progress,
  onPlay = () => {},
  onPause = () => {},
  onResume = () => {},
  onStop = () => {},
  onSpeedChange = () => {},
  onVoiceChange = () => {},
  currentVoice,
}: PlaybackControlsProps) {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(currentVoice);
  const [selectedSpeed, setSelectedSpeed] = useState(playbackSpeed);
  const [isLoading, setIsLoading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);

  // Load available voices from browser
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsLoadingVoices(false);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const voiceOptions = voices
        .filter(voice => voice.lang.includes('en'))
        .map(voice => ({
          voice,
          name: `${voice.name} (${voice.lang})${voice.localService ? ' - Local' : ''}`
        }));
      
      setAvailableVoices(voiceOptions);
      setIsLoadingVoices(false);
      
      if (!selectedVoice && voiceOptions.length > 0) {
        setSelectedVoice(voiceOptions[0].voice);
      }
    }
  }, [selectedVoice]);

  useEffect(() => {
    setSelectedVoice(currentVoice);
  }, [currentVoice]);

  useEffect(() => {
    setSelectedSpeed(playbackSpeed);
  }, [playbackSpeed]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsLoadingVoices(false);
      return;
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      onPause();
    } else if (isPaused) {
      onResume();
    } else {
      onPlay();
    }
  };

  const handleApplyChanges = async () => {
    setIsLoading(true);
    
    // Apply voice change if different
    if (selectedVoice && selectedVoice !== currentVoice) {
      onVoiceChange(selectedVoice);
    }
    
    // Apply speed change if different
    if (selectedSpeed !== playbackSpeed) {
      onSpeedChange(selectedSpeed);
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    setIsLoading(false);
  };

  const handleRefreshVoices = () => {
    setIsLoadingVoices(true);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = null;
      setTimeout(loadVoices, 100);
    }
  };

  const speedOptions = [0.5, 0.9, 1.0, 1.5, 2.0];

  return (
    <section className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Playback Controls</h3>
        <div className="flex items-center space-x-2 text-sm text-muted">
          <Clock size={16} />
          <span data-testid="text-duration">~2 min</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted mb-2">
          <span data-testid="text-current-time">{currentTime}</span>
          <span data-testid="text-total-time">{totalTime}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 cursor-pointer">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full"
          title="Previous"
          data-testid="button-previous"
        >
          <SkipBack size={20} />
        </Button>
        
        <Button
          className="w-16 h-16 bg-primary hover:bg-primary-dark rounded-full shadow-lg"
          onClick={handlePlayPause}
          data-testid="button-play-pause"
        >
          {isPlaying && !isPaused ? (
            <Pause size={24} />
          ) : (
            <Play size={24} />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full"
          title="Next"
          data-testid="button-next"
        >
          <SkipForward size={20} />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full"
          onClick={onStop}
          title="Stop"
          data-testid="button-stop"
        >
          <Square size={20} />
        </Button>
      </div>

      {/* Voice Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Voice Selection
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshVoices}
            disabled={isLoadingVoices}
            className="h-7 px-2 text-xs"
            title="Refresh voices"
          >
            <RotateCw size={12} className={`mr-1 ${isLoadingVoices ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedVoice ? availableVoices.findIndex(v => v.voice === selectedVoice) : -1}
            onChange={(e) => {
              const index = parseInt(e.target.value);
              if (index >= 0 && index < availableVoices.length) {
                setSelectedVoice(availableVoices[index].voice);
              }
            }}
            className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
            data-testid="select-voice"
            disabled={isLoadingVoices || availableVoices.length === 0}
          >
            {isLoadingVoices ? (
              <option value={-1}>Loading voices...</option>
            ) : availableVoices.length === 0 ? (
              <option value={-1}>No voices available</option>
            ) : (
              availableVoices.map((voiceOption, index) => (
                <option key={voiceOption.name} value={index}>
                  {voiceOption.name}
                </option>
              ))
            )}
          </select>
        </div>
        {!isLoadingVoices && availableVoices.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            No speech synthesis voices found. Check your browser settings.
          </p>
        )}
      </div>

      {/* Speed Control */}
      <div className="flex items-center space-x-4 mb-4">
        <label className="text-sm font-medium text-gray-700 min-w-max">
          Speed: <span data-testid="text-speed">{selectedSpeed.toFixed(1)}x</span>
        </label>
        <Slider
          value={[selectedSpeed]}
          onValueChange={(value) => setSelectedSpeed(value[0])}
          min={0.5}
          max={2.0}
          step={0.1}
          className="flex-1"
          data-testid="slider-speed"
        />
        <div className="flex space-x-1">
          {speedOptions.map((speed) => (
            <Button
              key={speed}
              variant={selectedSpeed === speed ? "default" : "outline"}
              size="sm"
              className="px-3 py-1 text-xs"
              onClick={() => setSelectedSpeed(speed)}
              data-testid={`button-speed-${speed}`}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleApplyChanges}
          disabled={isLoading || 
                   (selectedVoice === currentVoice && selectedSpeed === playbackSpeed) ||
                   availableVoices.length === 0}
          className="min-w-[100px]"
          data-testid="button-apply"
        >
          {isLoading ? "Applying..." : "Apply Changes"}
        </Button>
      </div>
    </section>
  );
}