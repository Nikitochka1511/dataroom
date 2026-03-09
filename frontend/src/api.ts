export type FolderNode = {
    id: number;
    name: string;
    parent_id: number | null;
    children: FolderNode[];
  };

  export type FolderPathItem = {
    id: number;
    name: string;
    parent_id: number | null;
  };

  export type SearchItem = {
    id: number;
    type: "file" | "folder";
    name: string;
    folder_id: number | null;
    path: string;
  };
  
  const API_BASE = import.meta.env.VITE_API_BASE;
  export { API_BASE };
  const FETCH_OPTS: RequestInit = {
    credentials: "include",
  };

  export async function searchItems(query: string): Promise<SearchItem[]> {
const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, FETCH_OPTS);  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to search items");
    }
  
    return res.json();
  }

  export async function fetchFolderTree(): Promise<FolderNode[]> {
    const r = await fetch(`${API_BASE}/folders/tree`, FETCH_OPTS);
        if (!r.ok) throw new Error(`Failed to load tree: ${r.status}`);
    return r.json();
  }

  export async function googleStatus(): Promise<{ connected: boolean }> {
    const r = await fetch(`${API_BASE}/auth/google/status`, FETCH_OPTS);
        if (!r.ok) throw new Error(`Failed to get google status: ${r.status}`);
    return r.json();
  }
  
  export async function listFolderPath(folderId: number): Promise<FolderPathItem[]> {
    const r = await fetch(`${API_BASE}/folders/${folderId}/path`, FETCH_OPTS);    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || "Failed to load folder path");
    }
    return r.json();
  }

  export async function googleLogout(): Promise<void> {
    const r = await fetch(`${API_BASE}/auth/google/logout`, {
      method: "POST",
      credentials: "include",
    });
        if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `Logout failed: ${r.status}`);
    }
  }

  export type FolderRecord = {
    id: number;
    name: string;
    parent_id: number | null;
    user_id?: number;
  };
  
  export async function createFolder(
    name: string,
    parent_id: number | null
  ): Promise<FolderRecord> {
    const r = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, parent_id }),
    });
  
    if (!r.ok) {
      let msg = `Failed to create folder: ${r.status}`;
      try {
        const data = await r.json();
        if (data?.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
  
    return r.json();
  }

  export async function renameFolder(folderId: number, name: string): Promise<void> {
    const r = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  
    if (!r.ok) {
      let msg = `Failed to rename folder: ${r.status}`;
      try {
        const data = await r.json();
        if (data?.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
  }

  export async function deleteFolder(folderId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: "DELETE",
      credentials: "include",
    });
  
    if (!res.ok) {
      let msg = "Failed to delete folder";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
  }

  export async function uploadFile(file: File, folderId: number) {
    const form = new FormData();
    form.append("file", file);
    form.append("folder_id", String(folderId));
  
    const r = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
  
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t);
    }
  
    return r.json();
  }
  
  export async function listFiles(folderId: number) {
    const r = await fetch(`${API_BASE}/folders/${folderId}/files`, FETCH_OPTS);
    if (!r.ok) {
      throw new Error(`Failed to list files: ${r.status}`);
    }
    return r.json();
  }

  export async function listChildFolders(folderId: number) {
    const r = await fetch(`${API_BASE}/folders/${folderId}/children`, FETCH_OPTS);
    if (!r.ok) {
      throw new Error(`Failed to list child folders: ${r.status}`);
    }
    return r.json() as Promise<Array<{ id: number; name: string; parent_id: number | null }>>;
  }

  export async function deleteFile(fileId: number): Promise<void> {
    const r = await fetch(`${API_BASE}/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t);
    }
  }

  export async function renameFile(fileId: number, name: string): Promise<void> {
    const r = await fetch(`${API_BASE}/files/${fileId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  
    if (!r.ok) {
      let msg = `Failed to rename file: ${r.status}`;
      try {
        const data = await r.json();
        if (data?.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
  }

  export type DriveFile = {
    id: string;
    name: string;
    size?: string; 
    modifiedTime?: string;
    mimeType?: string;
  };
  
  export async function listDriveFiles(): Promise<DriveFile[]> {
    const r = await fetch(`${API_BASE}/drive/files`, FETCH_OPTS);
        if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `Failed to load Drive files: ${r.status}`);
    }
    return r.json();
  }
  
  export async function importDriveFile(fileId: string, folderId: number): Promise<void> {
    const r = await fetch(`${API_BASE}/drive/import`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId, folder_id: folderId }),
    });
  
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `Import failed: ${r.status}`);
    }
  }