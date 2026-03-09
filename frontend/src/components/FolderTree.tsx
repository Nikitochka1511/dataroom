import { useEffect, useState } from "react";
import { fetchFolderTree, createFolder, deleteFolder, renameFolder } from "../api";
import type { FolderNode } from "../api";

function FolderItem({
    node,
    level,
    onSelect,
    onDelete,
    onRename,
    onCreateSubfolder,
    selectedId,
    onToggle,
    isExpanded,
    onContext,
  }: {
    node: FolderNode;
    level: number;
    onSelect: (id: number) => void;
    onDelete: (id: number, parentId: number | null) => void;
    onRename: (node: FolderNode) => void;
    onCreateSubfolder: (node: FolderNode) => void;
    selectedId: number;
    onToggle: (id: number) => void;
    isExpanded: (id: number) => boolean;
    onContext: (id: number, x: number, y: number) => void;
  }) {  
    
    
    const isSelected = node.id === selectedId;

    const hasChildren = (node.children?.length ?? 0) > 0;
    const expanded = isExpanded(node.id);
    
    return (
        <div
          className="treeNode"
          style={{ marginLeft: level === 0 ? 0 : 12 }}
        >
        <div
  className={`treeRow ${isSelected ? "treeRowSelected" : ""}`}
  onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContext(node.id, e.clientX, e.clientY);
          }}
        >
          {/* caret */}
          <div
  className={`treeCaret ${hasChildren ? "treeCaretActive" : "treeCaretEmpty"}`}
  onClick={(e) => {
    e.stopPropagation();
    if (hasChildren) onToggle(node.id);
  }}
  title={hasChildren ? (expanded ? "Collapse" : "Expand") : ""}
>
  {hasChildren ? (expanded ? "▾" : "▸") : ""}
</div>
    
<div className="treeFolderIcon">📁</div>
    
<div
  onClick={() => onSelect(node.id)}
  className="treeLabel"
  title={node.name}
>
  {node.name}
</div>
        </div>
    
        {/* children */}
        {expanded ? (
  <div className="treeChildren">
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
        onToggle={onToggle}
        isExpanded={isExpanded}
        onContext={onContext}
      />
    ))}
  </div>
) : null}
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

  function findPathToNode(nodes: FolderNode[], targetId: number): number[] {
    for (const node of nodes) {
      if (node.id === targetId) return [node.id];
  
      const childPath = findPathToNode(node.children || [], targetId);
      if (childPath.length > 0) {
        return [node.id, ...childPath];
      }
    }
  
    return [];
  }


  export default function FolderTree({
    selectedId,
    onSelect,
    reloadKey,
    onTreeChanged,
    onFilesChanged,
  }: {
    selectedId: number;
    onSelect: (id: number) => void;
    reloadKey: number;
    onTreeChanged: () => void;
    onFilesChanged: () => void;
  }) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  function isExpanded(id: number) {
    return expandedIds.has(id);
  }
  
  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
  
      await load();
      onTreeChanged();
      onFilesChanged();
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
      onTreeChanged();
      onFilesChanged();
      setCtxMenu(null);
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
      const created = await createFolder(name, parent.id);

      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parent.id);
        return next;
      });

      onSelect(created.id);
      await load();
      onTreeChanged();
      onFilesChanged();
      setCtxMenu(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }


  useEffect(() => {
    load();
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedId || selectedId === 0) return;

    const pathIds = findPathToNode(tree, selectedId);
    if (pathIds.length === 0) return;

    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of pathIds.slice(0, -1)) {
        next.add(id);
      }
      return next;
    });
  }, [tree, selectedId]);

 
  useEffect(() => {
    function closeMenu() {
      setCtxMenu(null);
    }
  
    document.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
  
    return () => {
      document.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);       
  

  if (loading) return <div>Loading folders...</div>;
  if (err) return <div style={{ color: "red" }}>Error: {err}</div>;

  return (
    <div>
      <div className="sidebarSectionTitle">Documents</div>
  
      {tree.length === 0 ? (
  <div>No folders yet.</div>
) : (
  tree.map((node) => (
    <FolderItem
      key={node.id}
      node={node}
      level={0}
      onSelect={onSelect}
      onDelete={handleDelete}
      onRename={handleRenameFolder}
      onCreateSubfolder={handleCreateSubfolder}
      selectedId={selectedId}
      onToggle={toggleExpanded}
      isExpanded={isExpanded}
      onContext={(id, x, y) => {
        setCtxMenu({ id, x, y });
      }}
    />
  ))
)}
{ctxMenu ? (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: ctxMenu.x,
      top: ctxMenu.y,
      background: "#1e2430",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: 8,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      zIndex: 999999,
      minWidth: 180,
    }}
  >
    <button
      className="btn"
      onClick={() => {
        onSelect(ctxMenu.id);
        setCtxMenu(null);
      }}
    >
      Open
    </button>

    <button
      className="btn"
      onClick={async () => {
        const node = findNode(tree, ctxMenu.id);
        if (node) await handleRenameFolder(node);
        setCtxMenu(null);
      }}
    >
      Rename
    </button>

    <button
      className="btn"
      onClick={async () => {
        const node = findNode(tree, ctxMenu.id);
        if (node) await handleCreateSubfolder(node);
        setCtxMenu(null);
      }}
    >
      Create subfolder
    </button>

    <button
      className="btn btnDanger"
      onClick={async () => {
        const node = findNode(tree, ctxMenu.id);
        if (node) await handleDelete(node.id, node.parent_id ?? null);
        setCtxMenu(null);
      }}
    >
      Delete
    </button>
  </div>
) : null}

    </div>

  );
}