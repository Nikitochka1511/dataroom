import os
import uuid
import requests
from flask import Blueprint, jsonify, request, current_app

from ..db import db
from ..models import File
from ..services.google_tokens import get_valid_access_token

bp = Blueprint("drive", __name__)

DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
DRIVE_DOWNLOAD_URL = "https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"


@bp.get("/drive/files")
def drive_list_files():
    access_token = get_valid_access_token()

    # беремо тільки PDF
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
    access_token = get_valid_access_token()
    payload = request.get_json(silent=True) or {}

    file_id = payload.get("file_id")
    folder_id = payload.get("folder_id")

    if not file_id:
        return jsonify(error="file_id is required"), 400
    if not folder_id:
        return jsonify(error="folder_id is required"), 400

    headers = {"Authorization": f"Bearer {access_token}"}

    # 1) метадані, щоб знати назву і size
    meta_params = {"fields": "id,name,size,mimeType"}
    meta = requests.get(f"{DRIVE_FILES_URL}/{file_id}", params=meta_params, headers=headers, timeout=20)
    if not meta.ok:
        return jsonify(error="failed to fetch file metadata", details=meta.text), 400

    meta_json = meta.json()
    name = meta_json.get("name") or "drive_file.pdf"
    mime = meta_json.get("mimeType")
    size = int(meta_json.get("size") or 0)

    if mime != "application/pdf":
        return jsonify(error="only PDF can be imported"), 400

    # 2) скачати файл
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

    # 3) запис в БД як звичайний upload
    rec = File(
        name=name,
        folder_id=int(folder_id),
        storage_path=storage_path,
        size=size,
    )
    db.session.add(rec)
    db.session.commit()

    return jsonify(ok=True, imported_file=rec.to_dict()), 201