export type FolderNode = {
    id: number;
    name: string;
    parent_id: number | null;
    children: FolderNode[];
  };
  
  const API_BASE = "http://127.0.0.1:5000";
  
  export async function fetchFolderTree(): Promise<FolderNode[]> {
    const r = await fetch(`${API_BASE}/folders/tree`);
    if (!r.ok) throw new Error(`Failed to load tree: ${r.status}`);
    return r.json();
  }

  export async function createFolder(
    name: string,
    parent_id: number | null
  ): Promise<void> {
    const r = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, parent_id }),
    });
  
    if (!r.ok) throw new Error(`Failed to create folder: ${r.status}`);
  }

  export async function deleteFolder(folderId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: "DELETE",
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
  
    const r = await fetch("http://127.0.0.1:5000/files/upload", {
      method: "POST",
      body: form,
    });
  
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t);
    }
  
    return r.json();
  }
  
  export async function listFiles(folderId: number) {
    const r = await fetch(`${API_BASE}/folders/${folderId}/files`);
    if (!r.ok) {
      throw new Error(`Failed to list files: ${r.status}`);
    }
    return r.json();
  }

  export async function deleteFile(fileId: number): Promise<void> {
    const r = await fetch(`http://127.0.0.1:5000/files/${fileId}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t);
    }
  }