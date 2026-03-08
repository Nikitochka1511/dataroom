import os
import uuid

import requests
from flask import Blueprint, jsonify, request, current_app, session
from werkzeug.utils import secure_filename

from ..db import db
from ..models import File, Folder
from ..services.google_tokens import get_valid_access_token

bp = Blueprint("drive", __name__)

DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
DRIVE_DOWNLOAD_URL = "https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"


def _require_user_id():
    user_id = session.get("user_id")
    if not user_id:
        return None, (jsonify(error="unauthorized"), 401)
    return user_id, None


def _unique_file_name(
    user_id: int,
    base_name: str,
    folder_id: int,
    exclude_id: int | None = None,
) -> str:
    if "." in base_name:
        stem, ext = base_name.rsplit(".", 1)
        ext = "." + ext
    else:
        stem, ext = base_name, ""

    candidate = base_name
    i = 1

    while True:
        q = File.query.filter(
            File.user_id == user_id,
            File.folder_id == folder_id,
            File.name == candidate,
        )

        if exclude_id is not None:
            q = q.filter(File.id != exclude_id)

        exists = q.first()
        if not exists:
            return candidate

        candidate = f"{stem} ({i}){ext}"
        i += 1


def _get_access_token_or_401():
    try:
        return get_valid_access_token(), None
    except RuntimeError as e:
        msg = str(e).lower()
        if (
            "not connected" in msg
            or "reconnect" in msg
            or "missing refresh token" in msg
            or "not authenticated" in msg
        ):
            return None, (jsonify(error="google_not_connected", message=str(e)), 401)

        return None, (jsonify(error="google_token_error", message=str(e)), 502)


@bp.get("/drive/files")
def drive_list_files():
    user_id, err = _require_user_id()
    if err:
        return err

    access_token, err = _get_access_token_or_401()
    if err:
        return err

    q = "mimeType='application/pdf' and trashed=false"
    params = {
        "q": q,
        "pageSize": 50,
        "fields": "files(id,name,size,modifiedTime,mimeType)",
        "orderBy": "modifiedTime desc",
    }
    headers = {"Authorization": f"Bearer {access_token}"}

    r = requests.get(DRIVE_FILES_URL, params=params, headers=headers, timeout=20)
    if not r.ok:
        return jsonify(error="failed to list drive files", details=r.text), 400

    data = r.json()
    return jsonify(data.get("files", []))


@bp.post("/drive/import")
def drive_import_file():
    user_id, err = _require_user_id()
    if err:
        return err

    access_token, err = _get_access_token_or_401()
    if err:
        return err

    payload = request.get_json(silent=True) or {}

    file_id = payload.get("file_id")
    folder_id = payload.get("folder_id")

    if not file_id:
        return jsonify(error="file_id is required"), 400
    if not folder_id:
        return jsonify(error="folder_id is required"), 400

    folder = Folder.query.filter_by(id=int(folder_id), user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    headers = {"Authorization": f"Bearer {access_token}"}

    meta_params = {"fields": "id,name,size,mimeType"}
    meta = requests.get(
        f"{DRIVE_FILES_URL}/{file_id}",
        params=meta_params,
        headers=headers,
        timeout=20,
    )
    if not meta.ok:
        return jsonify(error="failed to fetch file metadata", details=meta.text), 400

    meta_json = meta.json()
    name = meta_json.get("name") or "drive_file.pdf"
    mime = meta_json.get("mimeType")
    size = int(meta_json.get("size") or 0)

    name = secure_filename(name) or "drive_file.pdf"
    if not name.lower().endswith(".pdf"):
        name = name + ".pdf"

    name = _unique_file_name(user_id, name, int(folder_id))

    if mime != "application/pdf":
        return jsonify(error="only PDF can be imported"), 400

    download_url = DRIVE_DOWNLOAD_URL.format(file_id=file_id)
    dl = requests.get(download_url, headers=headers, stream=True, timeout=60)
    if not dl.ok:
        return jsonify(error="failed to download file", details=dl.text), 400

    storage_dir = current_app.config["STORAGE_DIR"]
    os.makedirs(storage_dir, exist_ok=True)

    storage_name = f"{uuid.uuid4().hex}.pdf"
    storage_path = os.path.join(storage_dir, storage_name)

    with open(storage_path, "wb") as f:
        for chunk in dl.iter_content(chunk_size=1024 * 256):
            if chunk:
                f.write(chunk)

    rec = File(
        user_id=user_id,
        name=name,
        folder_id=int(folder_id),
        storage_path=storage_path,
        size=size,
        mime_type="application/pdf",
    )
    db.session.add(rec)
    db.session.commit()

    return jsonify(ok=True, imported_file=rec.to_dict()), 201