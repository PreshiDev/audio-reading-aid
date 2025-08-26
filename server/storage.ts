import { type Document, type InsertDocument } from "@shared/schema";
import Database from "better-sqlite3";
import path from "path";

export interface IStorage {
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
}

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), "database.db");
    this.db = new Database(dbPath);
    
    // Create table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const stmt = this.db.prepare("SELECT * FROM documents WHERE id = ?");
    return stmt.get(id) as Document | undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    const stmt = this.db.prepare("SELECT * FROM documents ORDER BY created_at DESC");
    return stmt.all() as Document[];
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, content, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(insertDocument.title, insertDocument.content);
    const id = result.lastInsertRowid as number;
    
    const document = await this.getDocument(id);
    if (!document) {
      throw new Error("Failed to create document");
    }
    
    return document;
  }

  async deleteDocument(id: number): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    stmt.run(id);
  }
}

export const storage = new SQLiteStorage();
