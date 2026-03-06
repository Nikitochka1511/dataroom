import { useEffect, useRef, useState } from "react";
import { API_BASE, searchItems, type SearchItem } from "../api";

export default function SearchModal({
  open,
  onClose,
  onSelectFolder,
}: {
  open: boolean;
  onClose: () => void;
  onSelectFolder: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setResults([]);
    setError("");

    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const data = await searchItems(trimmed);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function handleItemClick(item: SearchItem) {
    if (item.type === "folder") {
      onSelectFolder(item.folder_id || item.id);
      onClose();
      return;
    }

    if (item.folder_id) {
      onSelectFolder(item.folder_id);
    }

    window.open(`${API_BASE}/files/${item.id}/view`, "_blank");
    onClose();
  }

  if (!open) return null;

  const folders = results.filter((x) => x.type === "folder");
  const files = results.filter((x) => x.type === "file");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(18, 22, 28, 0.98)",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ opacity: 0.7 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type file or folder name to search..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              fontSize: 14,
            }}
          />
          <button className="btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ maxHeight: "420px", overflow: "auto" }}>
          {!query.trim() ? (
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>
              Start typing to search for file or folder.
            </div>
          ) : loading ? (
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>
              Searching...
            </div>
          ) : error ? (
            <div style={{ padding: 16, color: "#ff8f8f" }}>
              Error: {error}
            </div>
          ) : results.length === 0 ? (
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>
              No results found.
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {folders.length > 0 ? (
                <>
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      opacity: 0.65,
                      textTransform: "uppercase",
                    }}
                  >
                    Folders
                  </div>

                  {folders.map((item) => (
                    <button
                      key={`folder-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: "28px 1fr 220px",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        textAlign: "left",
                        borderRadius: 10,
                      }}
                    >
                      <div>📁</div>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div
                        className="muted"
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                        }}
                      >
                        {item.path}
                      </div>
                    </button>
                  ))}
                </>
              ) : null}

              {files.length > 0 ? (
                <>
                  <div
                    style={{
                      padding: "10px 10px 8px",
                      fontSize: 12,
                      opacity: 0.65,
                      textTransform: "uppercase",
                    }}
                  >
                    Files
                  </div>

                  {files.map((item) => (
                    <button
                      key={`file-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: "28px 1fr 220px",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        textAlign: "left",
                        borderRadius: 10,
                      }}
                    >
                      <div>📄</div>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div
                        className="muted"
                        style={{
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                        }}
                      >
                        {item.path}
                      </div>
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}