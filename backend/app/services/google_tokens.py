import os

print("CLIENT_ID =", os.getenv("GOOGLE_CLIENT_ID"))
secret = os.getenv("GOOGLE_CLIENT_SECRET")
print("SECRET_LAST4 =", secret[-4:] if secret else None)
print("REDIRECT_URI =", os.getenv("GOOGLE_REDIRECT_URI"))
print("FRONTEND_ORIGIN =", os.getenv("FRONTEND_ORIGIN"))

from datetime import datetime, timedelta

import requests
from flask import session

from ..db import db
from ..models import GoogleToken

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def get_valid_access_token() -> str:
    user_id = session.get("user_id")
    if not user_id:
        raise RuntimeError("User is not authenticated")

    tok = GoogleToken.query.filter_by(user_id=user_id).first()
    if not tok or not tok.access_token:
        raise RuntimeError("Google is not connected")

    if tok.expires_at and tok.expires_at <= datetime.utcnow() + timedelta(seconds=30):
        if not tok.refresh_token:
            raise RuntimeError("Missing refresh token. Reconnect Google Drive.")

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise RuntimeError("Missing GOOGLE_CLIENT_ID/SECRET")

        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": tok.refresh_token,
            "grant_type": "refresh_token",
        }

        r = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=20)
        if not r.ok:
            raise RuntimeError(f"Failed to refresh token: {r.status_code}")

        payload = r.json()
        new_access = payload.get("access_token")
        expires_in = payload.get("expires_in")

        if not new_access:
            raise RuntimeError("Refresh did not return access_token")

        tok.access_token = new_access
        if expires_in:
            tok.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))

        db.session.commit()

    return tok.access_token