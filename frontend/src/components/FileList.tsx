import { useEffect, useState } from "react";
import { listFiles, uploadFile, deleteFile } from "../api";

type FileRec = {
  id: number;
  name: string;
  size: number;
};

export default function FileList({ folderId }: { folderId: number }) {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!folderId || folderId === 0) {
      setFiles([]);
      return;
    }

    try {
      setError("");
      setLoading(true);
      const data = await listFiles(folderId);
      setFiles(data);
    } catch (err) {
      setFiles([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setError("");

    if (!folderId || folderId === 0) {
      setError("Select a folder first.");
      e.target.value = "";
      return;
    }

    // легка client-side валідація
    if (f.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }

    try {
      setLoading(true);
      await uploadFile(f, folderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(file: FileRec) {
    const ok = window.confirm(`Delete "${file.name}"?`);
    if (!ok) return;

    try {
      setError("");
      setLoading(true);
      await deleteFile(file.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <div className="toolbarLeft">
          <h2 style={{ margin: 0, fontSize: 16 }}>Files</h2>
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        <div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            disabled={!folderId || folderId === 0 || loading}
          />
        </div>
      </div>

      {!folderId || folderId === 0 ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Select a folder to view and upload files.
        </div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255, 80, 80, 0.12)" }}>
          <div style={{ fontSize: 13 }}>Error: {error}</div>
        </div>
      ) : null}

      <div className="table">
        <div className="tableHeader">
          <div>Name</div>
          <div>Size</div>
          <div style={{ textAlign: "right" }}>Action</div>
        </div>

        {files.length === 0 ? (
          <div style={{ padding: 12 }} className="muted">
            {folderId && folderId !== 0 ? (loading ? "Loading..." : "No files in this folder.") : "—"}
          </div>
        ) : (
          files.map((f) => (
            <div className="tableRow" key={f.id}>
              <div className="fileName">
                <a className="fileLink" href={`http://127.0.0.1:5000/files/${f.id}/view`} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
              </div>

              <div className="muted">{(f.size / 1024).toFixed(1)} KB</div>

              <div style={{ textAlign: "right" }}>
                <button className="btn btnDanger" onClick={() => handleDelete(f)} disabled={loading}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}