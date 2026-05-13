# CloudTodo - Google Drive-Based Task Management

## Overview

CloudTodo is a privacy-first task management app that leverages your personal Google Drive as a secure, decentralized backend. It eliminates the need for third-party databases, providing you with 100% ownership, portability, and control over your data.

---

## Key Features

### User-Owned Storage
- **Decentralized Storage**: All tasks are stored as JSON files within your own Google Drive storage space.
- **Native Attachments**: High-speed handling of images, videos, documents, and audio recordings, managed in a structured folder hierarchy.
- **Zero-Server Footprint**: Your data never touches an external database. It moves directly between your browser and Google's global infrastructure.

### AI-Powered Suggestions
- **Smart Completions**: OpenAI-powered suggestions for task titles, descriptions, categories, and search — debounced and served via `gpt-4o-mini`.

### Premium UI/UX
- **Rich Aesthetics**: A professional dark-mode interface with glassmorphism, smooth transitions, and vibrant accents.
- **Multi-View System**: Pivot between a high-efficiency Grid View and a tactical Kanban Board.
- **Visual Intelligence**: Dedicated markers for Pinned and Starred tasks.

### Integrated Cloud Assets
- **Atomic Categorization**: Attachments are organized per-task, ensuring all related media stays within its own context.
- **Secure Media Pipeline**: Images and media are fetched as binary blobs and rendered securely, bypassing public URL exposure.
- **Recursive Cleanup**: Deleting a task automatically purges its associated attachments folder, maintaining a clean Drive environment.

---

## Architecture

### Folder Structure in your Drive
```
User's Google Drive
└── CLOUDTODO/                    # Root Application Hub
    ├── tasks/                    # Task Metadata Registry
    │   ├── task-1712345678.json  # Task JSON Metadata
    │   └── task-1712345679.json
    └── attachments/              # Binary Asset Storage
        ├── <taskId>/             # Dedicated folder for a specific task
        │   ├── image.jpg
        │   └── document.pdf
```

### Data Flow
1. **Authentication**: Secure handshake via Google OAuth 2.0 with minimal scope requirements.
2. **Storage**: Tasks saved as JSON files to your Google Drive.
3. **Attachments**: Files uploaded via Multipart Upload to per-task folders.
4. **Sync**: Local state syncs with Drive every 30 seconds.

---

## Tech Stack

- **Frontend**: React 19 (TypeScript)
- **Build System**: Vite 7
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4 (Custom Design System)
- **Icons**: Lucide React
- **Networking**: Axios (Direct Google API Integration)
- **AI**: OpenAI API (gpt-4o-mini)
- **Auth**: OAuth 2.0 Scoped Access

---

## Getting Started

### Prerequisites
- Node.js 20 or higher
- A Google Cloud Project with the Google Drive API enabled
- An OpenAI API key

### 1. Configure Google Cloud
1. Enable the Google Drive API in the Google Cloud Console.
2. Create OAuth 2.0 Credentials for a Web Application.
3. Add `http://localhost:5173` to the Authorized JavaScript origins.

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/yourdudeken/cloudtodo.git
cd cloudtodo

# Install dependencies
npm install

# Configure environment
echo "VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com" > .env
echo "VITE_OPENAI_API_KEY=sk-your-openai-api-key" >> .env
```

### 3. Execution
```bash
npm run dev
```

---

## Privacy and Security Policy

### Data Sovereignty
Your productivity data is a private conversation between you and your storage provider. CloudTodo does not have a backend, tracking pixels, or an analytics engine.

### Scoped Access
The application requests the `drive.file` scope. This means it can only access files it created or those you explicitly opened with it. It cannot read your other private documents on Google Drive.

---

**Efficiency without compromise.**
