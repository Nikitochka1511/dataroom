# Harvey Data Room

Harvey Data Room is a minimal full-stack document management application built as a technical assignment for a Full-Stack Developer role.

The project works like a lightweight virtual data room inspired by Google Drive or Dropbox. It allows users to organize folders, upload and manage PDF documents, import files from Google Drive, and search across stored content.

---

## Main Features

- Folder tree navigation
- Nested folders
- Create folders
- Breadcrumb navigation
- Upload PDF files
- View PDF files in browser
- Rename files
- Delete files
- Import PDF files from Google Drive
- Global search for folders and files
- Search results with full path display

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Python
- Flask
- SQLAlchemy
- SQLite

### Integration
- Google Drive API OAuth

---

## Project Structure

```text
backend/
  app/
    routes/
      drive.py
      files.py
      folders.py
      google_auth.py
    services/
      file_storage.py
      folder_delete.py
      folder_tree.py
      google_tokens.py
    __init__.py
    db.py
    models.py
  instance/
    dataroom.db

frontend/
  public/
  src/
    assets/
    components/
      FileList.tsx
      FolderTree.tsx
      QuickActions.tsx
      SearchModal.tsx
      WelcomeGate.tsx
    api.ts
    App.css
    App.tsx
    index.css
    main.tsx
  package.json
  vite.config.ts

storage/
```

---

## How It Works

The UI is built in an explorer-style layout:

- Left sidebar — folder tree
- Main panel — folders and files inside the selected folder
- Top header — breadcrumbs and actions
- Search modal — global search

The backend exposes REST endpoints for folder and file management.

---

## Setup

### Clone repository

```bash
git clone <your-repo-url>
cd DATAROOM
```

---

### Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python run.py
```

Backend runs on:

```
http://127.0.0.1:5000
```

---

### Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## Google Drive Integration

The project supports importing PDF files from Google Drive through OAuth authentication.

Flow:

1. User connects Google Drive
2. Backend stores Google token data
3. Frontend opens Drive import modal
4. User selects a PDF
5. File is imported into the selected folder

---

## Search

The project includes a global search modal that searches across:

- folders
- files

Each result shows:

- item name
- item type
- full path

Clicking a result opens the corresponding folder.

---

## Current Status

Core functionality implemented:

- folder hierarchy
- sidebar folder tree
- file listing
- PDF upload
- PDF preview
- file rename
- file delete
- Google Drive import
- breadcrumbs
- global search

The project is currently an MVP suitable for technical review.

---

## Notes

Files are stored locally in the `storage/` directory.

Database:

```
backend/instance/dataroom.db
```

---

## Possible Improvements

- Drag & drop upload
- Multi-file upload
- Bulk delete
- Better UI polish
- Loading states
- Multi-user support
- Permissions

---

## Author

Mykyta Abrosimov
