import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema } from "@shared/schema";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only .txt files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload document (text content or file)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      let title = "";
      let content = "";

      if (req.file) {
        // File upload
        title = req.body.title || req.file.originalname.replace(".txt", "");
        content = req.file.buffer.toString("utf-8");
      } else {
        // Text content from body
        const validation = insertDocumentSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ 
            message: "Invalid input", 
            errors: validation.error.errors 
          });
        }
        
        title = validation.data.title;
        content = validation.data.content;
      }

      if (!content.trim()) {
        return res.status(400).json({ message: "Content cannot be empty" });
      }

      const document = await storage.createDocument({ title, content });
      res.json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to save document" });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
