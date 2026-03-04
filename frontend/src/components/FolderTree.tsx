import { useEffect, useState } from "react";
import { fetchFolderTree, FolderNode, createFolder, deleteFolder } from "../api";

function FolderItem({
    node,
    level,
    onSelect,
    onDelete,
    selectedId,
  }: {
    node: FolderNode;
    level: number;
    onSelect: (id: number) => void;
    onDelete: (id: number, parentId: number | null) => void;
    selectedId: number;
  }) {
    const isSelected = node.id === selectedId;
  
    return (
      <div style={{ marginLeft: level * 16, padding: "4px 0" }}>
        <span style={{ marginRight: 8 }}>📁</span>
  
        <span
          onClick={() => onSelect(node.id)}
          style={{
            cursor: "pointer",
            fontWeight: isSelected ? 700 : 400,
            textDecoration: isSelected ? "underline" : "none",
          }}
        >
          {node.name}
          <button
  onClick={(e) => {
    e.stopPropagation();
    onDelete(node.id, node.parent_id ?? null);
  }}
  style={{ marginLeft: 8 }}
  title="Delete folder"
>
  🗑️
</button>
        </span>
  
        {node.children.map((c) => (
  <FolderItem
    key={c.id}
    node={c}
    level={level + 1}
    onSelect={onSelect}
    onDelete={onDelete}
    selectedId={selectedId}
  />
))}
      </div>
    );
  }


  function findNode(nodes: FolderNode[], id: number): FolderNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const child = findNode(n.children || [], id);
      if (child) return child;
    }
    return null;
  }
  
  function subtreeContains(node: FolderNode, targetId: number): boolean {
    if (node.id === targetId) return true;
    return (node.children || []).some((c) => subtreeContains(c, targetId));
  }


export default function FolderTree({ selectedId, onSelect }: { selectedId: number, onSelect: (id: number) => void }) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [newName, setNewName] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchFolderTree();
      setTree(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
  
    await createFolder(newName, selectedId); 
    setNewName("");
    load(); 
  }

  async function handleDelete(folderId: number, parentId: number | null) {
    const ok = window.confirm("Delete this folder and everything inside it?");
    if (!ok) return;
  
    const deletedNode = findNode(tree, folderId);
    const selectedWillDie =
      deletedNode ? subtreeContains(deletedNode, selectedId) : folderId === selectedId;
  
    try {
      await deleteFolder(folderId);
  
      if (selectedWillDie) {
        if (parentId) onSelect(parentId);
        else onSelect(0);
      }
  
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }
  

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Loading folders...</div>;
  if (err) return <div style={{ color: "red" }}>Error: {err}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Folders</h2>
        <button onClick={load}>Refresh</button>
      </div>
  
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New folder name"
        />
        <button onClick={handleCreate}>Create folder</button>
      </div>
  
      {tree.length === 0 ? (
        <div>No folders yet.</div>
      ) : (
        tree.map((n) => (
            <FolderItem
              key={n.id}
              node={n}
              level={0}
              onSelect={onSelect}
              onDelete={handleDelete}
              selectedId={selectedId}
            />
          ))
      )}
    </div>
  );
}