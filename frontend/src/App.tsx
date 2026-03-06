import { useEffect, useState } from "react";
import FolderTree from "./components/FolderTree";
import FileList from "./components/FileList";
import QuickActions from "./components/QuickActions";
import "./App.css";
import WelcomeGate from "./components/WelcomeGate";
import { googleStatus, googleLogout } from "./api";


const API_BASE = "http://127.0.0.1:5000";

function openCenteredPopup(url: string, title: string, w = 520, h = 700) {
  const dualScreenLeft = window.screenLeft ?? window.screenX;
  const dualScreenTop = window.screenTop ?? window.screenY;

  const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;

  const left = width / 2 - w / 2 + dualScreenLeft;
  const top = height / 2 - h / 2 + dualScreenTop;

  const features = `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`;
  return window.open(url, title, features);
}

export default function App() {
  const [selectedFolder, setSelectedFolder] = useState(0);
  const [treeReloadKey, setTreeReloadKey] = useState(0);
  const [filesReloadKey, setFilesReloadKey] = useState(0);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleStatusMsg, setGoogleStatusMsg] = useState("");

  const [appReady, setAppReady] = useState(false);

  function connectGoogle() {
    setGoogleStatusMsg("");
    const popup = openCenteredPopup(`${API_BASE}/auth/google/login`, "Connect Google Drive");
    if (!popup) {
      setGoogleStatusMsg("Popup blocked. Allow popups for this site.");
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // безпечно: приймаємо тільки повідомлення від нашого backend
      if (event.origin !== API_BASE) return;

      const data = event.data;
      if (!data || data.type !== "google_oauth_result") return;

      if (data.ok) {
        setGoogleConnected(true);
        setGoogleStatusMsg("Google Drive connected ✅");
      } else {
        setGoogleConnected(false);
        setGoogleStatusMsg(`Google Drive error: ${data.message || "unknown error"}`);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
              <div className="appTitle">Harvey: Data Room</div>
  
              <div className="appHeaderRight">
                <button
                  className="btn"
                  onClick={async () => {
                    try {
                      await googleLogout();
                    } finally {
                      setAppReady(false);
                      setGoogleConnected(false);
                      setGoogleStatusMsg("");
                    }
                  }}
                  title="Sign out from Google Drive"
                >
                  ⋯ Sign out
                </button>
              </div>
            </div>
  
            {googleStatusMsg ? <div className="topNotice">{googleStatusMsg}</div> : null}
  
            <div className="appBody">
              <aside className="sidebar">
                <QuickActions
                  selectedFolderId={selectedFolder}
                  onTreeChanged={() => setTreeReloadKey((x) => x + 1)}
                  onFilesChanged={() => setFilesReloadKey((x) => x + 1)}
                />
  
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
                />
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  );
}