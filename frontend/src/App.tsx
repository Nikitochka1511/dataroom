import { useEffect, useState } from "react";
import FolderTree from "./components/FolderTree";
import FileList from "./components/FileList";
import "./App.css";
import WelcomeGate from "./components/WelcomeGate";
import { googleLogout, listFolderPath, type FolderPathItem } from "./api";
import SearchModal from "./components/SearchModal";

const API_BASE = "https://dataroom-b3qr.onrender.com";

export default function App() {
  const [selectedFolder, setSelectedFolder] = useState(0);
  const [treeReloadKey, setTreeReloadKey] = useState(0);
  const [filesReloadKey, setFilesReloadKey] = useState(0);

  const [appReady, setAppReady] = useState(false);
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);

  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== API_BASE) return;

      const data = event.data;
      if (!data || data.type !== "google_oauth_result") return;
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
  
    async function loadPath() {
      if (!selectedFolder || selectedFolder === 0) {
        setFolderPath([]);
        return;
      }
  
      try {
        const path = await listFolderPath(selectedFolder);
        if (!cancelled) setFolderPath(path);
      } catch {
        if (!cancelled) setFolderPath([]);
      }
    }
  
    loadPath();
  
    return () => {
      cancelled = true;
    };
  }, [selectedFolder]);

  return (
    <div className="appPage">
      <div className="appShell">
        {!appReady ? (
          <WelcomeGate
            onConnected={() => {
              setAppReady(true);
            }}
          />
        ) : (
          <>
            <div className="appHeader">
  <div className="appHeaderLeft">
    <div className="appTitle">Harvey: Data Room</div>
  </div>

  <div className="appHeaderPath">
    <div className="breadcrumbs breadcrumbsInHeader">
      <button
        className={`breadcrumbItem ${selectedFolder === 0 ? "breadcrumbItemActive" : ""}`}
        onClick={() => setSelectedFolder(0)}
        type="button"
      >
        Root
      </button>

      {folderPath.map((item) => (
        <div key={item.id} className="breadcrumbSegment">
          <span className="breadcrumbSep">/</span>
          <button
            className={`breadcrumbItem ${item.id === selectedFolder ? "breadcrumbItemActive" : ""}`}
            onClick={() => setSelectedFolder(item.id)}
            type="button"
          >
            {item.name}
          </button>
        </div>
      ))}
    </div>
  </div>

  <div className="appHeaderRight">


  <button
  className="btn"
  onClick={() => setShowSearch(true)}
  title="Search files and folders"
  style={{ minWidth: 140 }}
>
  Search...
</button>

                <button
                  className="btn"
                  onClick={async () => {
                    try {
                      await googleLogout();
                    } finally {
                      setAppReady(false);
                    }
                  }}
                  title="Sign out from Google Drive"
                >
                Sign out
                </button>
              </div>
            </div>
  
            <div className="appBody">
              <aside className="sidebar">
                <FolderTree
                  selectedId={selectedFolder}
                  onSelect={setSelectedFolder}
                  reloadKey={treeReloadKey}
                  onTreeChanged={() => setTreeReloadKey((x) => x + 1)}
                  onFilesChanged={() => setFilesReloadKey((x) => x + 1)}
                />
              </aside>

              <main className="content">
                <FileList
                  folderId={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  reloadKey={filesReloadKey}
                  onTreeChanged={() => setTreeReloadKey((x) => x + 1)}
                  onFilesChanged={() => setFilesReloadKey((x) => x + 1)}
                />
              </main>
            </div>

            <SearchModal
              open={showSearch}
              onClose={() => setShowSearch(false)}
              onSelectFolder={setSelectedFolder}
            />
          </>

          
        )}
      </div>
    </div>
  );
}