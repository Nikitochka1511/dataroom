import os
from datetime import datetime, timedelta

import requests
from flask import Blueprint, jsonify, redirect, request

bp = Blueprint("google_auth", __name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.readonly"


def _cfg():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:5000/auth/google/callback")
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    if not client_id or not client_secret:
        raise RuntimeError("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars")

    return client_id, client_secret, redirect_uri, frontend_origin


@bp.get("/auth/google/login")
def google_login():
    client_id, _, redirect_uri, _ = _cfg()

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": DRIVE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }

    req = requests.Request("GET", GOOGLE_AUTH_URL, params=params).prepare()
    return redirect(req.url)


@bp.get("/auth/google/callback")
def google_callback():
    client_id, client_secret, redirect_uri, frontend_origin = _cfg()

    error = request.args.get("error")
    if error:
        return _popup_close(frontend_origin, ok=False, message=error)

    code = request.args.get("code")
    if not code:
        return _popup_close(frontend_origin, ok=False, message="missing code")

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    r = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=20)
    if not r.ok:
        return _popup_close(frontend_origin, ok=False, message=f"token exchange failed: {r.status_code}")

    token = r.json()

    access_token = token.get("access_token")
    refresh_token = token.get("refresh_token")
    expires_in = token.get("expires_in")

    if not access_token:
        return _popup_close(frontend_origin, ok=False, message="no access_token")

    from ..db import db
    from ..models import GoogleToken

    expires_at = None
    if expires_in:
        expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))

    existing = GoogleToken.query.first()

    if existing:
        existing.access_token = access_token
        if refresh_token:
            existing.refresh_token = refresh_token
        existing.expires_at = expires_at
    else:
        db.session.add(GoogleToken(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at
        ))

    db.session.commit()

    return _popup_close(frontend_origin, ok=True, message="connected")


def _popup_close(frontend_origin: str, ok: bool, message: str):
    payload_ok = "true" if ok else "false"
    safe_msg = (message or "").replace('"', '\\"')
    return f"""
<!doctype html>
<html>
  <body>
    <script>
      try {{
        if (window.opener) {{
          window.opener.postMessage({{ type: "google_oauth_result", ok: {payload_ok}, message: "{safe_msg}" }}, "{frontend_origin}");
        }}
      }} catch (e) {{}}
      window.close();
    </script>
    You can close this window.
  </body>
</html>
""", 200, {"Content-Type": "text/html"}


@bp.get("/auth/google/status")
def google_status():
    # Поки що просто заглушка, зберігання зробимо наступним кроком
    return jsonify(connected=False, note="token storage not implemented yet")