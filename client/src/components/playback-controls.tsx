import { Clock, SkipBack, Play, Pause, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  currentTime: string;
  totalTime: string;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function PlaybackControls({
  isPlaying,
  isPaused,
  playbackSpeed,
  currentTime,
  totalTime,
  progress,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
}: PlaybackControlsProps) {
  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      onPause();
    } else if (isPaused) {
      onResume();
    } else {
      onPlay();
    }
  };

  const speedOptions = [0.5, 1.0, 1.5, 2.0];

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

      {/* Speed Control */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700 min-w-max">
          Speed: <span data-testid="text-speed">{playbackSpeed.toFixed(1)}x</span>
        </label>
        <Slider
          value={[playbackSpeed]}
          onValueChange={(value) => onSpeedChange(value[0])}
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
              variant="outline"
              size="sm"
              className="px-3 py-1 text-xs"
              onClick={() => onSpeedChange(speed)}
              data-testid={`button-speed-${speed}`}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
