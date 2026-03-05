import { useEffect, useState } from "react";
import { fetchFolderTree, FolderNode, createFolder, deleteFolder, renameFolder } from "../api";

function FolderItem({
    node,
    level,
    onSelect,
    onDelete,
    onRename,
    onCreateSubfolder,
    selectedId,
    menuFolderId,
    setMenuFolderId,
  }: {
    node: FolderNode;
    level: number;
    onSelect: (id: number) => void;
    onDelete: (id: number, parentId: number | null) => void;
    onRename: (node: FolderNode) => void;
    onCreateSubfolder: (node: FolderNode) => void;
    selectedId: number;
    menuFolderId: number | null;
    setMenuFolderId: (id: number | null) => void;
  }) {  
    
    
    const isSelected = node.id === selectedId;

return (
  <div style={{ marginLeft: level * 16, padding: "4px 0" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ opacity: 0.9 }}>📁</div>

      <div
        onClick={() => onSelect(node.id)}
        style={{
          cursor: "pointer",
          fontWeight: isSelected ? 700 : 400,
          textDecoration: isSelected ? "underline" : "none",
          flex: 1,
          userSelect: "none",
        }}
        title="Open folder"
      >
        {node.name}
      </div>

      <div style={{ position: "relative" }}>
      <button
  data-folder-menu-btn="1"
  onClick={(e) => {
    e.stopPropagation();
    setMenuFolderId(menuFolderId === node.id ? null : node.id);
  }}
  title="Actions"
  style={{ cursor: "pointer" }}
>
  ⋯
</button>

        {menuFolderId === node.id && (
          <div
          data-folder-menu="1"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
              position: "absolute",
              right: 0,
              top: 28,
              background: "#1e2430",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              zIndex: 50,
              pointerEvents: "auto",
                            minWidth: 160,
            }}
          >
            <button
              onClick={() => onSelect(node.id)}
              style={{ cursor: "pointer" }}
            >
              Open
            </button>

            <button
              onClick={() => onRename(node)}
              style={{ cursor: "pointer" }}
            >
              Rename
            </button>

            <button
              onClick={() => onCreateSubfolder(node)}
              style={{ cursor: "pointer" }}
            >
              Create subfolder
            </button>

            <button
              onClick={() => onDelete(node.id, node.parent_id ?? null)}
              style={{ cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>

    {node.children.map((c) => (
      <FolderItem
        key={c.id}
        node={c}
        level={level + 1}
        onSelect={onSelect}
        onDelete={onDelete}
        onRename={onRename}
        onCreateSubfolder={onCreateSubfolder}
        selectedId={selectedId}
        menuFolderId={menuFolderId}
        setMenuFolderId={setMenuFolderId}
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
  const [menuFolderId, setMenuFolderId] = useState<number | null>(null);

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
    const name = newName.trim();
    if (!name) return;
  
    const parentId = selectedId === 0 ? null : selectedId;
  
    try {
      await createFolder(name, parentId);
      setNewName("");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
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
  
  async function handleRenameFolder(node: FolderNode) {
    const newName = window.prompt("Rename folder:", node.name);
    if (!newName) return;
  
    const name = newName.trim();
    if (!name) return;
  
    try {
      await renameFolder(node.id, name);
      await load();
      setMenuFolderId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }
  
  async function handleCreateSubfolder(parent: FolderNode) {
    const nameRaw = window.prompt(`Create folder inside "${parent.name}":`, "");
    if (!nameRaw) return;
  
    const name = nameRaw.trim();
    if (!name) return;
  
    try {
      await createFolder(name, parent.id);
      await load();
      setMenuFolderId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }


  useEffect(() => {
    load();
  }, []);
 
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const target = e.target;
  
      if (!(target instanceof Element)) return;
  
      // якщо клік по меню або по кнопці ⋯ — не закриваємо
      if (target.closest('[data-folder-menu="1"]')) return;
      if (target.closest('[data-folder-menu-btn="1"]')) return;
  
      setMenuFolderId(null);
    }
  
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);
  

  if (loading) return <div>Loading folders...</div>;
  if (err) return <div style={{ color: "red" }}>Error: {err}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Folders</h2>
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
  onRename={handleRenameFolder}
  onCreateSubfolder={handleCreateSubfolder}
  selectedId={selectedId}
  menuFolderId={menuFolderId}
  setMenuFolderId={setMenuFolderId}
/>
          ))
      )}
    </div>
  );
}