import { useEffect, useState } from "react";
import { listFiles, uploadFile, deleteFile } from "../api";


type FileRec = {
  id: number;
  name: string;
  size: number;
};

export default function FileList({ folderId }: { folderId: number }) {
  const [files, setFiles] = useState<FileRec[]>([]);

  async function load() {
    const data = await listFiles(folderId);
    setFiles(data);
  }

  useEffect(() => {
    load();
  }, [folderId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    await uploadFile(f, folderId);
    load();
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Files</h3>
  
      <input type="file" accept="application/pdf" onChange={handleUpload} />
  
      <div style={{ marginTop: 10 }}>
        {files.map((f) => (
          <div
            key={f.id}
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
          >
            <a href={`http://127.0.0.1:5000/files/${f.id}/view`} target="_blank">
              {f.name}
            </a>
  
            <span style={{ opacity: 0.6, fontSize: 12 }}>
              {(f.size / 1024).toFixed(1)} KB
            </span>
  
            <button
              onClick={async () => {
                if (!confirm(`Delete "${f.name}"?`)) return;
                await deleteFile(f.id);
                load();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}