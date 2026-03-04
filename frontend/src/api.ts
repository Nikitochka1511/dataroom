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