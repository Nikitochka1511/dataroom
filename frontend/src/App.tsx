import { useState } from "react";
import FolderTree from "./components/FolderTree";
import FileList from "./components/FileList";
import "./App.css";

export default function App() {
  const [selectedFolder, setSelectedFolder] = useState(0);

  return (
    <div className="appPage">
      <div className="appShell">
        <div className="appHeader">
          <div className="appTitle">DataRoom</div>
        </div>

        <div className="appBody">
          <aside className="sidebar">
            <FolderTree selectedId={selectedFolder} onSelect={setSelectedFolder} />
          </aside>

          <main className="content">
            <FileList folderId={selectedFolder} />
          </main>
        </div>
      </div>
    </div>
  );
}