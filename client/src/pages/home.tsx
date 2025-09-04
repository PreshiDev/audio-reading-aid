import { useState } from "react";
import { Volume2 } from "lucide-react";
import TextInput from "@/components/text-input";
import PlaybackControls from "@/components/playback-controls";
import SavedDocuments from "@/components/saved-documents";
import PWAInstallButton from "@/components/pwa-install-button";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";

export default function Home() {
  const [currentText, setCurrentText] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  
  const {
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
  } = useSpeechSynthesis();

  const handlePlayText = (text: string) => {
    if (text.trim()) {
      speak(text);
    }
  };

  const handleTextChange = (text: string, title: string) => {
    setCurrentText(text);
    setCurrentTitle(title);
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Volume2 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyVoice</h1>
                <p className="text-sm text-muted">Text-to-Speech Learning Aid</p>
              </div>
            </div>
            
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TextInput 
          onTextChange={handleTextChange}
          onPlayText={handlePlayText}
          currentText={currentText}
          currentTitle={currentTitle}
        />
        
        <PlaybackControls
          isPlaying={isPlaying}
          isPaused={isPaused}
          playbackSpeed={playbackSpeed}
          currentTime={currentTime}
          totalTime={totalTime}
          progress={progress}
          onPlay={() => currentText && handlePlayText(currentText)}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onSpeedChange={setSpeed}
        />
        
        <SavedDocuments 
          onDocumentSelect={(document) => {
            setCurrentText(document.content);
            setCurrentTitle(document.title);
          }}
          onPlayDocument={(document) => {
            setCurrentText(document.content);
            setCurrentTitle(document.title);
            handlePlayText(document.content);
          }}
        />
      </main>
    </div>
  );
}
