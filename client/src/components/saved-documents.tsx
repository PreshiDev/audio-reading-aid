import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Play, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface SavedDocumentsProps {
  onDocumentSelect: (document: Document) => void;
  onPlayDocument: (document: Document) => void;
}

export default function SavedDocuments({ 
  onDocumentSelect, 
  onPlayDocument 
}: SavedDocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteDocumentMutation.mutate(id);
  };

  const handlePlay = (e: React.MouseEvent, document: Document) => {
    e.stopPropagation();
    onPlayDocument(document);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Created just now";
    } else if (diffInHours < 24) {
      return `Created ${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Created ${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <section className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Saved Documents</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh"
        >
          <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-state">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 mb-2">No saved documents yet</p>
            <p className="text-sm text-muted">Upload a file or paste some text above to get started</p>
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group"
              onClick={() => onDocumentSelect(document)}
              data-testid={`document-${document.id}`}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate" data-testid={`document-title-${document.id}`}>
                  {document.title}
                </h4>
                <p className="text-sm text-muted mt-1" data-testid={`document-date-${document.id}`}>
                  {formatDate(document.created_at)}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2" data-testid={`document-content-${document.id}`}>
                  {document.content.substring(0, 100)}
                  {document.content.length > 100 && "..."}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  className="w-8 h-8 bg-primary hover:bg-primary-dark rounded-full"
                  onClick={(e) => handlePlay(e, document)}
                  title="Play this document"
                  data-testid={`button-play-${document.id}`}
                >
                  <Play size={12} />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="w-8 h-8 rounded-full"
                  onClick={(e) => handleDelete(e, document.id)}
                  disabled={deleteDocumentMutation.isPending}
                  title="Delete document"
                  data-testid={`button-delete-${document.id}`}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
