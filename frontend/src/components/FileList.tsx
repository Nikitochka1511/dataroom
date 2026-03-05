import { useEffect, useState } from "react";
import { listFiles, listChildFolders, uploadFile, deleteFile, listDriveFiles, importDriveFile, type DriveFile } from "../api";

type FileRec = {
  id: number;
  name: string;
  size: number;
};

type ChildFolder = {
    id: number;
    name: string;
    parent_id: number | null;
  };

  export default function FileList({
    folderId,
    onSelectFolder,
  }: {
    folderId: number;
    onSelectFolder: (id: number) => void;
  }) {
  const [files, setFiles] = useState<FileRec[]>([]);
  const [folders, setFolders] = useState<ChildFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDrive, setShowDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState("");

  async function load() {
    if (!folderId || folderId === 0) {
      setFiles([]);
      setFolders([]);
      return;
    }
  
    try {
      setError("");
      setLoading(true);
  
      const [childFolders, fileList] = await Promise.all([
        listChildFolders(folderId),
        listFiles(folderId),
      ]);
  
      setFolders(childFolders);
      setFiles(fileList);
    } catch (err) {
      setFiles([]);
      setFolders([]);
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

  function closeDriveModal() {
    setShowDrive(false);
    setDriveError("");
    setDriveFiles([]);
  }

  async function openDriveModal() {
    setDriveError("");

    if (!folderId || folderId === 0) {
      setError("Select a folder first.");
      return;
    }

    try {
      setDriveLoading(true);
      const items = await listDriveFiles();
      setDriveFiles(items);
      setShowDrive(true);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : String(err));
      setShowDrive(true);
    } finally {
      setDriveLoading(false);
    }
  }

  async function handleImportFromDrive(driveFile: DriveFile) {
    if (!folderId || folderId === 0) {
      setError("Select a folder first.");
      return;
    }

    const ok = window.confirm(`Import "${driveFile.name}" into this folder?`);
    if (!ok) return;

    try {
      setDriveError("");
      setLoading(true);
      await importDriveFile(driveFile.id, folderId);
      await load();
      closeDriveModal();
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : String(err));
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn"
            onClick={openDriveModal}
            disabled={!folderId || folderId === 0 || loading}
            title="Import PDF files from your Google Drive"
          >
            <span style={{ marginRight: 8 }}>🟢</span>
            Import from Drive
          </button>

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

        <div className="table" style={{ marginBottom: 12 }}>
        <div className="tableHeader" style={{ gridTemplateColumns: "1fr" }}>
            <div>Folders</div>
        </div>

        {folders.length === 0 ? (
            <div style={{ padding: 12 }} className="muted">
            No folders in this folder.
            </div>
        ) : (
            folders.map((fo) => (
            <div
                key={fo.id}
                className="folderRow"
                onClick={() => onSelectFolder(fo.id)}
                title="Open folder"
            >
                <span className="folderIcon">📁</span>
                <div className="fileName">{fo.name}</div>
            </div>
            ))
        )}
        </div>

      <div className="table">
        <div className="tableHeader">
          <div>Files</div>
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

      {showDrive ? (
        <div
          onClick={closeDriveModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 96vw)",
              maxHeight: "80vh",
              overflow: "auto",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(20, 24, 32, 0.98)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Import from Google Drive</div>
              <button className="btn" onClick={closeDriveModal}>Close</button>
            </div>

            {driveError ? (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255, 80, 80, 0.12)" }}>
                <div style={{ fontSize: 13 }}>Error: {driveError}</div>
              </div>
            ) : null}

            <div style={{ marginTop: 12 }} className="table">
              <div className="tableHeader" style={{ gridTemplateColumns: "1fr 120px 140px" }}>
                <div>Name</div>
                <div>Size</div>
                <div style={{ textAlign: "right" }}>Action</div>
              </div>

              {driveLoading ? (
                <div style={{ padding: 12 }} className="muted">Loading Drive files...</div>
              ) : driveFiles.length === 0 ? (
                <div style={{ padding: 12 }} className="muted">No PDF files found in Drive.</div>
              ) : (
                driveFiles.map((df) => {
                  const sizeKb = df.size ? (Number(df.size) / 1024).toFixed(1) : "—";
                  return (
                    <div className="tableRow" key={df.id} style={{ gridTemplateColumns: "1fr 120px 140px" }}>
                      <div className="fileName">{df.name}</div>
                      <div className="muted">{sizeKb === "—" ? "—" : `${sizeKb} KB`}</div>
                      <div style={{ textAlign: "right" }}>
                        <button
                          className="btn"
                          onClick={() => handleImportFromDrive(df)}
                          disabled={loading}
                        >
                          Import
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}