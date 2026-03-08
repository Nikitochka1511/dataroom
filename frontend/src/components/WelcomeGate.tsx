import { useEffect, useState } from "react";
import { API_BASE, googleStatus } from "../api";

function openCenteredPopup(url: string, title: string, w = 520, h = 700) {
  const dualScreenLeft = (window as any).screenLeft ?? window.screenX;
  const dualScreenTop = (window as any).screenTop ?? window.screenY;

  const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;

  const left = width / 2 - w / 2 + dualScreenLeft;
  const top = height / 2 - h / 2 + dualScreenTop;

  const features = `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`;
  return window.open(url, title, features);
}

export default function WelcomeGate({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function refreshStatus() {
    try {
      setErr("");
      const s = await googleStatus();
      setConnected(!!s.connected);
      if (s.connected) onConnected();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }

  function connectGoogle() {
    setMsg("");
    setErr("");
    const popup = openCenteredPopup(`${API_BASE}/auth/google/login`, "Connect Google Drive");
    if (!popup) setErr("Popup blocked. Allow popups for this site.");
  }

  useEffect(() => {
    refreshStatus();

    function onMessage(event: MessageEvent) {
      

      if (event.origin !== new URL(API_BASE).origin) {
        return;
      }

      const data = event.data;
      if (!data || data.type !== "google_oauth_result") {
        return;
      }

      if (data.ok) {
        setMsg("Google Drive connected ✅");
        refreshStatus();
      } else {
        console.log("MAIN received oauth error");
        setErr(`Google Drive error: ${data.message || "unknown error"}`);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // якщо вже connected - gate миттєво відпустить, але ми все одно тримаємо UI простим
  if (checking) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Checking Google connection…</div>
        <div style={{ opacity: 0.75, marginTop: 8 }}>Please wait</div>
      </div>
    );
  }

  if (connected) return null;

  return (
    <div className="welcomeWrap">
      <div className="welcomeInner">
  <div className="welcomeBrand">Data Room</div>

  <div className="welcomeCard">
    <h2 className="welcomeTitle">Welcome back</h2>
    <p className="welcomeSub">Access Data Room with your Google account</p>

    <button className="welcomeBtn" onClick={connectGoogle}>
  <img
    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
    alt="Google"
    className="googleIcon"
  />

  <span className="welcomeBtnText">Continue with Google</span>
</button>
  
          {msg ? (
            <div style={{ marginTop: 12, opacity: 0.85, textAlign: "center" }}>{msg}</div>
          ) : null}
  
          {err ? <div className="welcomeError">Error: {err}</div> : null}
  
          <div className="welcomeSmall">
            By continuing you agree to our
            <br />
            Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}