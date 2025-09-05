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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // Speech playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(
    null
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startIndexRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
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
  };

  const handleSave = () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to save",
        variant: "destructive",
      });
      return;
    }

    saveDocumentMutation.mutate({
      title: title.trim() || "Untitled Document",
      content: text,
    });
  };

  // Improved speech synthesis with more natural cadence
  const playChunks = () => {
    if (!chunks.length) return;

    let index = startIndexRef.current || 0;
    setIsPlaying(true);

    const speakChunk = () => {
      if (index >= chunks.length) {
        setIsPlaying(false);
        setCurrentChunkIndex(null);
        return;
      }

      setCurrentChunkIndex(index);

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      
      // Enhanced human-like speech parameters
      utterance.rate = 0.95; // Slightly slower for more natural pace
      utterance.pitch = 1.05; // Slightly higher pitch for friendliness
      utterance.volume = 1;
      
      // Add small pauses between sentences for more natural flow
      const text = chunks[index];
      if (text.match(/[.!?]$/)) {
        utterance.rate = 0.9; // Slow down slightly at the end of sentences
      }
      
      // Add variation for questions to sound more engaging
      if (text.match(/\?$/)) {
        utterance.pitch = 1.1; // Slightly higher pitch for questions
      }

      utterance.onend = () => {
        index++;
        // Add natural pause between chunks (longer after sentences)
        const pause = text.match(/[.!?]$/) ? 350 : 200;
        setTimeout(speakChunk, pause);
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);

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
  };

  const resumePlayback = () => {
    speechSynthesis.resume();
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentChunkIndex(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Button
          className="flex-1"
          variant="secondary"
          onClick={() => setShowModal(true)}
          disabled={!text.trim()}
        >
          <BookOpen className="mr-2" size={16} /> Open & Play
        </Button>
        <Button
          className="flex-1 bg-secondary hover:bg-green-700"
          onClick={handleSave}
          disabled={saveDocumentMutation.isPending || !text.trim()}
        >
          <Save size={16} className="mr-2" />
          {saveDocumentMutation.isPending ? "Saving..." : "Save Document"}
        </Button>
      </div>

      {/* Modal Viewer */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-3xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b px-4 py-3">
              <h3 className="text-lg font-semibold">{title || "Document"}</h3>
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

            {/* Text content */}
            <div
              ref={containerRef}
              className="flex-1 p-4 overflow-y-auto text-base leading-relaxed"
            >
              {chunks.map((chunk, i) => (
                <span
                  key={i}
                  onClick={() => {
                    stopPlayback();
                    startIndexRef.current = i;
                    playChunks();
                  }}
                  className={`cursor-pointer ${
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
              {!isPlaying && (
                <Button
                  onClick={playChunks}
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