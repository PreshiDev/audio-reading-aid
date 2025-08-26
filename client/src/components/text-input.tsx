import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Play, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface TextInputProps {
  onTextChange: (text: string, title: string) => void;
  onPlayText: (text: string) => void;
  currentText: string;
  currentTitle: string;
}

export default function TextInput({ 
  onTextChange, 
  onPlayText, 
  currentText, 
  currentTitle 
}: TextInputProps) {
  const [text, setText] = useState(currentText);
  const [title, setTitle] = useState(currentTitle);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain") {
      toast({
        title: "Error",
        description: "Only .txt files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileName = file.name.replace(".txt", "");
      setText(content);
      setTitle(fileName);
      onTextChange(content, fileName);
      toast({
        title: "Success",
        description: `File "${file.name}" uploaded successfully!`,
      });
    };
    reader.readAsText(file);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onTextChange(value, title);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onTextChange(text, value);
  };

  const handleClear = () => {
    setText("");
    setTitle("");
    onTextChange("", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePlay = () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to play",
        variant: "destructive",
      });
      return;
    }
    onPlayText(text);
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

  return (
    <section className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Add Text Content</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          data-testid="button-clear"
        >
          <Trash2 size={16} className="mr-2" />
          Clear
        </Button>
      </div>

      {/* File Upload Area */}
      <div className="mb-6">
        <div 
          className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors rounded-lg p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          data-testid="file-upload-zone"
        >
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-2">Drop a text file here, or click to browse</p>
          <p className="text-sm text-muted">.txt files only, max 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-file"
          />
        </div>
      </div>

      <div className="flex items-center my-6">
        <div className="flex-1 border-t border-gray-200"></div>
        <span className="px-4 text-sm text-muted bg-surface">OR</span>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>

      {/* Text Input */}
      <div className="mb-6">
        <Label htmlFor="textInput" className="block text-sm font-medium text-gray-700 mb-2">
          Paste or type your text
        </Label>
        <Textarea
          id="textInput"
          placeholder="Paste your text here or upload a .txt file above..."
          className="h-48 text-base leading-relaxed resize-none"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          data-testid="textarea-text"
        />
      </div>

      {/* Document Title Input */}
      <div className="mb-6">
        <Label htmlFor="docTitle" className="block text-sm font-medium text-gray-700 mb-2">
          Document Title (optional)
        </Label>
        <Input
          id="docTitle"
          placeholder="Enter a title for this document..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          data-testid="input-title"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1 bg-primary hover:bg-primary-dark"
          onClick={handlePlay}
          data-testid="button-play"
        >
          <Play size={16} className="mr-2" />
          Play Text
        </Button>
        <Button
          className="flex-1 bg-secondary hover:bg-green-700"
          onClick={handleSave}
          disabled={saveDocumentMutation.isPending}
          data-testid="button-save"
        >
          <Save size={16} className="mr-2" />
          {saveDocumentMutation.isPending ? "Saving..." : "Save Document"}
        </Button>
      </div>
    </section>
  );
}
