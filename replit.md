# Onkawe - Text-to-Speech Learning Aid

## Overview

Onkawe is a modern Progressive Web App (PWA) designed as a text-to-speech learning aid. The application allows users to input text through typing or file upload, convert it to speech using the Web Speech API, and manage saved documents for later playback. Built with accessibility and mobile-first design in mind, it provides an intuitive interface for users who need text-to-speech functionality for learning purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based UI with type safety
- **Vite**: Fast development build tool with hot module replacement
- **Tailwind CSS**: Utility-first styling with shadcn/ui component library
- **Wouter**: Lightweight client-side routing
- **React Query (@tanstack/react-query)**: Server state management and caching
- **React Hook Form**: Form validation and management

### Backend Architecture
- **Express.js**: RESTful API server with TypeScript
- **Drizzle ORM**: Type-safe database operations with SQLite
- **Multer**: File upload handling for text documents
- **Better SQLite3**: Local database for document storage

### Data Storage
- **SQLite Database**: Local file-based storage for documents
- **Document Schema**: Simple table with id, title, content, and timestamp
- **File Upload Support**: Text file processing with validation

### Authentication and Authorization
- **Session-based**: Simple session management without complex auth flows
- **Local Storage**: No user accounts - documents stored locally per session

### Text-to-Speech Integration
- **Web Speech API**: Native browser speech synthesis
- **Playback Controls**: Play, pause, stop, speed adjustment
- **Progress Tracking**: Estimated reading time and progress indication

### Progressive Web App Features
- **Service Worker**: Offline caching and performance optimization
- **Web App Manifest**: Native app-like installation and experience
- **Mobile Responsive**: Touch-optimized interface for mobile devices
- **Install Prompt**: Guided installation for supported browsers

### API Design
- **RESTful Endpoints**: 
  - `POST /api/upload` - Document creation (text or file)
  - `GET /api/documents` - Retrieve all documents
  - `GET /api/documents/:id` - Get specific document
  - `DELETE /api/documents/:id` - Remove document
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Request Validation**: Zod schema validation for data integrity

### Development Architecture
- **Monorepo Structure**: Shared types and schemas between client/server
- **Hot Reloading**: Development server with instant updates
- **TypeScript**: Full-stack type safety with shared interfaces
- **ESM Modules**: Modern JavaScript module system throughout

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL driver (configurable database option)
- **better-sqlite3**: Local SQLite database operations
- **express**: Web server framework
- **react**: UI framework
- **vite**: Build tool and development server

### UI Components
- **@radix-ui**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **tailwindcss**: CSS framework
- **lucide-react**: Icon library

### Development Tools
- **typescript**: Type system
- **drizzle-kit**: Database migration tools
- **esbuild**: JavaScript bundler for production
- **tsx**: TypeScript execution for development

### File Processing
- **multer**: Multipart form data handling
- **@types/multer**: TypeScript definitions

### Browser APIs
- **Web Speech API**: Text-to-speech synthesis (no external service required)
- **File API**: Client-side file reading
- **Service Worker API**: PWA functionality