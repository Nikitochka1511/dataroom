import { useRef, useState } from "react";
import { createFolder, uploadFile } from "../api";

export default function QuickActions({
  selectedFolderId,
  onTreeChanged,
  onFilesChanged,
}: {
  selectedFolderId: number; // 0 = Root
  onTreeChanged: () => void;
  onFilesChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleNewFolder() {
    setErr("");

    const nameRaw = window.prompt("New folder name:", "");
    if (!nameRaw) return;

    const name = nameRaw.trim();
    if (!name) return;

    const parentId = selectedFolderId === 0 ? null : selectedFolderId;

    try {
      setLoading(true);
      await createFolder(name, parentId);
      onTreeChanged();
      onFilesChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleUploadClick() {
    setErr("");

    if (!selectedFolderId || selectedFolderId === 0) {
      setErr("Select a folder first.");
      return;
    }

    fileInputRef.current?.click();
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    if (!selectedFolderId || selectedFolderId === 0) {
      setErr("Select a folder first.");
      e.target.value = "";
      return;
    }

    const files = Array.from(list);

    // allow only PDFs
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) {
      setErr("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }

    try {
      setLoading(true);
      setErr("");

      // upload sequentially (safer)
      for (const f of pdfs) {
        await uploadFile(f, selectedFolderId);
      }

      onFilesChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Quick Actions</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn" onClick={handleNewFolder} disabled={loading}>
          📁 New Folder
        </button>

        <button className="btn" onClick={handleUploadClick} disabled={loading}>
          ⬆ Upload PDFs
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={onFilesSelected}
          style={{ display: "none" }}
        />
      </div>

      {err ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            background: "rgba(255, 80, 80, 0.12)",
            fontSize: 13,
          }}
        >
          Error: {err}
        </div>
      ) : null}
    </div>
  );
}