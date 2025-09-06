import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Trash2,
  Loader2,
  Play,
  Pause,
  Square,
  BookOpen,
  X,
  Save,
  Settings,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import mammoth from "mammoth";
import type { Document } from "@shared/schema";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextInputProps {
  onTextChange: (text: string, title: string) => void;
  currentText: string;
  currentTitle: string;
}

// Voice settings interface
interface VoiceSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export default function TextInput({
  onTextChange,
  currentText,
  currentTitle,
}: TextInputProps) {
  const [text, setText] = useState(currentText);
  const [title, setTitle] = useState(currentTitle);
  const [loadingFile, setLoadingFile] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Speech playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(
    null
  );
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startIndexRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const selectionRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceURI: null,
    rate: 0.9, // Slower default rate
    pitch: 1.0,
    volume: 1.0,
  });
  const [tempVoiceSettings, setTempVoiceSettings] = useState<VoiceSettings>({
    voiceURI: null,
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate a unique device ID for saving documents
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // Save document mutation with device-specific saving
  const saveDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; deviceId: string }) => {
      const response = await apiRequest("POST", "/api/upload", data);
      return response.json() as Promise<Document>;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive",
      });
    },
  });

  // Split into readable chunks for highlighting + playback
  const chunks = text
    ? text.match(/.{1,250}(\s|$)/g) || []
    : [];

  // Get available voices
  useEffect(() => {
    let isMounted = true;
    
    const loadVoices = () => {
      if (!isMounted) return;
      
      const voices = speechSynthesis.getVoices();
      // Filter to only include voices that can speak English for better performance
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      
      // Set a default voice if none is selected
      if (!voiceSettings.voiceURI && voices.length > 0) {
        // Prefer a natural-sounding voice if available
        const defaultVoice = voices.find(v => v.lang.includes('en')) || voices[0];
        setVoiceSettings(prev => ({
          ...prev,
          voiceURI: defaultVoice.voiceURI
        }));
        setTempVoiceSettings(prev => ({
          ...prev,
          voiceURI: defaultVoice.voiceURI
        }));
      }
    };
    
    // Load voices immediately if available
    if (speechSynthesis.getVoices().length > 0) {
      loadVoices();
    }
    
    // Some browsers load voices asynchronously
    speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      isMounted = false;
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Request wake lock to prevent device from sleeping (with feature detection)
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && wakeLockRef.current === null) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active');
      }
    } catch (err) {
      console.warn('Failed to acquire wake lock (may not be supported):', err);
      // Continue without wake lock - this is not a critical error
    }
  };

  // Release wake lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Error releasing wake lock:', err);
      }
      wakeLockRef.current = null;
      console.log('Wake Lock released');
    }
  };

  // Handle visibility change to reacquire wake lock
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current !== null) {
        // Try to reacquire wake lock if it was previously active
        await requestWakeLock();
      }
    };

    // Only add event listener if wake lock is supported
    if ('wakeLock' in navigator) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if ('wakeLock' in navigator) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // 📂 Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setLoadingFile(true);
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    let extractedText = "";

    try {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          extractedText = e.target?.result as string;
          finishFileProcessing(extractedText, fileName, file.name);
        };
        reader.readAsText(file);
        return;
      }

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          textContent += strings.join(" ") + "\n";
        }
        extractedText = textContent;
      }

      if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result?.value || "";
      }

      if (!extractedText.trim()) {
        toast({
          title: "Error",
          description: "No readable text found in this file",
          variant: "destructive",
        });
        setLoadingFile(false);
        return;
      }

      finishFileProcessing(extractedText, fileName, file.name);
    } catch (err) {
      console.error("File upload error:", err);
      toast({
        title: "Error",
        description: `Failed to read file: ${file.name}`,
        variant: "destructive",
      });
      setLoadingFile(false);
    }
  };

  const finishFileProcessing = (
    extractedText: string,
    fileName: string,
    originalName: string
  ) => {
    setText(extractedText);
    setTitle(fileName);
    onTextChange(extractedText, fileName);
    toast({
      title: "Success",
      description: `File "${originalName}" uploaded successfully!`,
    });
    setLoadingFile(false);
  };

  const handleClear = () => {
    setText("");
    setTitle("");
    onTextChange("", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopPlayback();
  };

  const handleSave = () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter or upload text before saving",
        variant: "destructive",
      });
      return;
    }

    saveDocumentMutation.mutate({
      title: title.trim() || "Untitled Document",
      content: text,
      deviceId: getDeviceId()
    });
  };

  // Apply voice settings
  const applyVoiceSettings = () => {
    setVoiceSettings({ ...tempVoiceSettings });
    
    // If currently playing, restart with new settings
    if (isPlaying || isPausedRef.current) {
      stopPlayback();
      
      // If we were in the middle of playback, restart from current position
      if (currentChunkIndex !== null) {
        setTimeout(() => {
          playChunks(currentChunkIndex);
        }, 100);
      }
    }
    
    toast({
      title: "Settings Applied",
      description: "Voice settings have been updated and will be used for future playback.",
    });
    
    setShowSettings(false);
  };

  // Open settings modal and initialize temp settings
  const openSettings = () => {
    setTempVoiceSettings({ ...voiceSettings });
    setShowSettings(true);
  };

  // Create a new utterance with current voice settings
  const createUtterance = (text: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply user-selected voice settings
    if (voiceSettings.voiceURI) {
      const selectedVoice = availableVoices.find(
        voice => voice.voiceURI === voiceSettings.voiceURI
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    return utterance;
  };

  // Handle word selection
  const handleWordSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      setSelectedWord(null);
      setSelectedWordIndex(null);
      selectionRangeRef.current = null;
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.split(/\s+/).length > 1) {
      // More than one word selected, clear selection
      setSelectedWord(null);
      setSelectedWordIndex(null);
      selectionRangeRef.current = null;
      return;
    }

    setSelectedWord(selectedText);
    
    // Store the range for highlighting
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      selectionRangeRef.current = {
        start: range.startOffset,
        end: range.endOffset
      };
    }

    // Create utterance for the selected word
    const utterance = createUtterance(selectedText);
    
    // Cancel any current speech
    speechSynthesis.cancel();
    
    // Speak the selected word
    speechSynthesis.speak(utterance);
    
    // Clear selection after speaking
    utterance.onend = () => {
      selection.removeAllRanges();
      setSelectedWord(null);
      setSelectedWordIndex(null);
      selectionRangeRef.current = null;
    };
  };

  // Improved speech synthesis with voice selection
  const playChunks = async (startIndex: number = 0) => {
    if (!chunks.length) return;

    // Always cancel any ongoing speech before starting new
    speechSynthesis.cancel();

    // Request wake lock to prevent device from sleeping (non-blocking)
    requestWakeLock().catch(err => {
      console.warn('Wake lock not available, continuing without it:', err);
    });

    let index = startIndex;
    setIsPlaying(true);
    isPausedRef.current = false;

    const speakChunk = () => {
      if (index >= chunks.length || isPausedRef.current) {
        if (index >= chunks.length) {
          setIsPlaying(false);
          setCurrentChunkIndex(null);
          releaseWakeLock().catch(() => {}); // Ignore errors in cleanup
        }
        return;
      }

      setCurrentChunkIndex(index);

      // Create a fresh utterance with current settings
      const utterance = createUtterance(chunks[index]);
      
      // Add small pauses between sentences for more natural flow
      const text = chunks[index];
      if (text.match(/[.!?]$/)) {
        utterance.rate = Math.max(0.7, voiceSettings.rate - 0.1);
      }
      
      // Add variation for questions to sound more engaging
      if (text.match(/\?$/)) {
        utterance.pitch = Math.min(2.0, voiceSettings.pitch + 0.1);
      }

      utterance.onend = () => {
        index++;
        // Add natural pause between chunks (longer after sentences)
        const pause = text.match(/[.!?]$/) ? 350 : 200;
        setTimeout(speakChunk, pause);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsPlaying(false);
        setCurrentChunkIndex(null);
        releaseWakeLock().catch(() => {}); // Ignore errors in cleanup
      };

      utteranceRef.current = utterance;
      
      try {
        speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Error speaking utterance:', err);
        setIsPlaying(false);
        setCurrentChunkIndex(null);
        releaseWakeLock().catch(() => {});
      }

      // Auto-scroll highlight into view
      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const highlighted = container.querySelector(".highlighted");
          highlighted?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    };

    speakChunk();
  };

  const pausePlayback = () => {
    speechSynthesis.pause();
    setIsPlaying(false);
    isPausedRef.current = true;
  };

  const resumePlayback = () => {
    speechSynthesis.resume();
    setIsPlaying(true);
    isPausedRef.current = false;
    
    // If we're at the end of the current utterance, continue to next chunk
    if (speechSynthesis.speaking === false && currentChunkIndex !== null) {
      playChunks(currentChunkIndex);
    }
  };

  const stopPlayback = async () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentChunkIndex(null);
    isPausedRef.current = false;
    await releaseWakeLock().catch(() => {}); // Silent cleanup
  };

  // Handle double-click to start reading from a specific position
  const handleTextSelection = (index: number) => {
    stopPlayback();
    startIndexRef.current = index;
    playChunks(index);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      releaseWakeLock().catch(() => {}); // Silent cleanup
    };
  }, []);

  return (
    <section className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Add Text Content</h2>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 size={16} className="mr-2" />
          Clear
        </Button>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <div
          className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors rounded-lg p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {loadingFile ? (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-primary mb-3" size={36} />
              <p className="text-gray-600">Converting file to text...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-2">
                Drop a text, PDF, or Word file here, or click to browse
              </p>
              <p className="text-sm text-muted">
                .txt, .pdf, .docx files only, max 10MB
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Title Input */}
      <div className="mb-6">
        <Label
          htmlFor="docTitle"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Document Title (optional)
        </Label>
        <Input
          id="docTitle"
          placeholder="Enter a title for this document..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onTextChange(text, e.target.value);
          }}
        />
      </div>

      {/* Action Buttons - Only show when there's text */}
      {text && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => setShowModal(true)}
          >
            <BookOpen className="mr-2" size={16} /> Open & Play
          </Button>
          <Button
            className="flex-1"
            onClick={openSettings}
          >
            <Settings className="mr-2" size={16} /> Voice Settings
          </Button>
          <Button
            className="flex-1 bg-secondary hover:bg-green-700"
            onClick={handleSave}
            disabled={saveDocumentMutation.isPending}
          >
            <Save size={16} className="mr-2" />
            {saveDocumentMutation.isPending ? "Saving..." : "Save Document"}
          </Button>
        </div>
      )}

      {/* Voice Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Voice Settings</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSettings(false)}
              >
                <X />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-select" className="block mb-2">
                  Voice
                </Label>
                <Select
                  value={tempVoiceSettings.voiceURI || ""}
                  onValueChange={(value) => 
                    setTempVoiceSettings({...tempVoiceSettings, voiceURI: value})
                  }
                >
                  <SelectTrigger id="voice-select">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="rate-slider" className="block mb-2">
                  Speed: {tempVoiceSettings.rate.toFixed(1)}
                </Label>
                <Slider
                  id="rate-slider"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[tempVoiceSettings.rate]}
                  onValueChange={([value]) => 
                    setTempVoiceSettings({...tempVoiceSettings, rate: value})
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="pitch-slider" className="block mb-2">
                  Pitch: {tempVoiceSettings.pitch.toFixed(1)}
                </Label>
                <Slider
                  id="pitch-slider"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[tempVoiceSettings.pitch]}
                  onValueChange={([value]) => 
                    setTempVoiceSettings({...tempVoiceSettings, pitch: value})
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="volume-slider" className="block mb-2">
                  Volume: {tempVoiceSettings.volume.toFixed(1)}
                </Label>
                <Slider
                  id="volume-slider"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[tempVoiceSettings.volume]}
                  onValueChange={([value]) => 
                    setTempVoiceSettings({...tempVoiceSettings, volume: value})
                  }
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={applyVoiceSettings}>
                <Check className="mr-2" size={16} />
                Apply Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Viewer */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-3xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b px-4 py-3">
              <h3 className="text-lg font-semibold">{title || "Document"}</h3>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={openSettings}
                >
                  <Settings size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    stopPlayback();
                    setShowModal(false);
                  }}
                >
                  <X />
                </Button>
              </div>
            </div>

            {/* Text content */}
            <div
              ref={containerRef}
              className="flex-1 p-4 overflow-y-auto text-base leading-relaxed"
              onMouseUp={handleWordSelection}
            >
              {chunks.map((chunk, i) => (
                <span
                  key={i}
                  onDoubleClick={() => handleTextSelection(i)}
                  className={`cursor-pointer select-none ${
                    i === currentChunkIndex
                      ? "bg-yellow-200 highlighted"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {chunk}
                </span>
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex gap-2 border-t p-4">
              {!isPlaying && currentChunkIndex === null && (
                <Button
                  onClick={() => playChunks(0)}
                  disabled={!text.trim()}
                  className="flex-1"
                >
                  <Play className="mr-2" size={16} /> Play
                </Button>
              )}
              {isPlaying && (
                <Button
                  onClick={pausePlayback}
                  className="flex-1"
                  variant="secondary"
                >
                  <Pause className="mr-2" size={16} /> Pause
                </Button>
              )}
              {!isPlaying && currentChunkIndex !== null && (
                <Button
                  onClick={resumePlayback}
                  className="flex-1"
                  variant="secondary"
                >
                  <Play className="mr-2" size={16} /> Resume
                </Button>
              )}
              <Button
                onClick={stopPlayback}
                className="flex-1"
                variant="destructive"
                disabled={!isPlaying && currentChunkIndex === null}
              >
                <Square className="mr-2" size={16} /> Stop
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}