import { useEffect, useState } from "react";
import { fetchFolderTree, FolderNode } from "../api";
import { createFolder } from "../api";

function FolderItem({
    node,
    level,
    onSelect,
    selectedId,
  }: {
    node: FolderNode;
    level: number;
    onSelect: (id: number) => void;
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
        </span>
  
        {node.children.map((c) => (
          <FolderItem
            key={c.id}
            node={c}
            level={level + 1}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
      </div>
    );
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
        tree.map((n) => <FolderItem key={n.id} node={n} level={0} onSelect={onSelect} selectedId={selectedId} />)
      )}
    </div>
  );
}