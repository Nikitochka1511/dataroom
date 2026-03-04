import { useState } from "react";
import FolderTree from "./components/FolderTree";
import FileList from "./components/FileList";

export default function App() {
  const [msg, setMsg] = useState("");

  async function ping() {
    const r = await fetch("http://127.0.0.1:5000/health");
    const data = await r.json();
    setMsg(JSON.stringify(data));
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>DataRoom</h1>
  
      <button onClick={ping}>Ping backend</button>
      <div style={{ marginTop: 20 }}>{msg}</div>
  
      <hr style={{ margin: "20px 0" }} />
  
      <FolderTree />
      
      <FileList folderId={1} />
    </div>
  );
}