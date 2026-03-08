import os

from flask import Blueprint, jsonify, request, send_file, current_app, session
from werkzeug.utils import secure_filename

from ..db import db
from ..models import Folder, File
from ..services.file_storage import validate_pdf, save_pdf

bp = Blueprint("files", __name__)


def _require_user_id():
    user_id = session.get("user_id")
    if not user_id:
        return None, (jsonify(error="unauthorized"), 401)
    return user_id, None


def build_folder_path(user_id: int, folder):
    parts = []
    current = folder

    while current is not None:
        parts.append(current.name)

        if current.parent_id is None:
            break

        current = Folder.query.filter_by(id=current.parent_id, user_id=user_id).first()

    return "Root / " + " / ".join(reversed(parts))


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


@bp.get("/search")
def search_items():
    user_id, err = _require_user_id()
    if err:
        return err

    q = (request.args.get("q") or "").strip()

    if not q:
        return jsonify([])

    folder_matches = (
        Folder.query
        .filter(
            Folder.user_id == user_id,
            Folder.name.ilike(f"%{q}%"),
        )
        .order_by(Folder.name.asc())
        .limit(20)
        .all()
    )

    file_matches = (
        File.query
        .filter(
            File.user_id == user_id,
            File.name.ilike(f"%{q}%"),
        )
        .order_by(File.name.asc())
        .limit(20)
        .all()
    )

    results = []

    for folder in folder_matches:
        folder_path = build_folder_path(user_id, folder)

        results.append({
            "id": folder.id,
            "type": "folder",
            "name": folder.name,
            "folder_id": folder.id,
            "path": folder_path,
        })

    for file in file_matches:
        folder_path = "Root"

        parent_folder = Folder.query.filter_by(id=file.folder_id, user_id=user_id).first()
        if parent_folder is not None:
            folder_path = build_folder_path(user_id, parent_folder)

        results.append({
            "id": file.id,
            "type": "file",
            "name": file.name,
            "folder_id": file.folder_id,
            "path": f"{folder_path} / {file.name}",
        })

    return jsonify(results)


@bp.post("/files/upload")
def upload_file():
    user_id, err = _require_user_id()
    if err:
        return err

    folder_id = request.form.get("folder_id", type=int)
    f = request.files.get("file")

    if not folder_id:
        return jsonify(error="folder_id is required"), 400
    if not f:
        return jsonify(error="file is required"), 400

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    try:
        validate_pdf(f)
    except ValueError as e:
        return jsonify(error=str(e)), 400

    storage_dir = current_app.config["STORAGE_DIR"]
    full_path, size = save_pdf(f, storage_dir)

    display_name = secure_filename(f.filename or "") or "file.pdf"
    if not display_name.lower().endswith(".pdf"):
        display_name = display_name + ".pdf"

    display_name = _unique_file_name(user_id, display_name, folder_id)

    rec = File(
        user_id=user_id,
        folder_id=folder_id,
        name=display_name,
        storage_path=full_path,
        size=size,
        mime_type=f.mimetype or "application/pdf",
    )
    db.session.add(rec)
    db.session.commit()

    return jsonify(rec.to_dict()), 201


@bp.get("/folders/<int:folder_id>/files")
def list_files(folder_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    files = (
        File.query
        .filter_by(folder_id=folder_id, user_id=user_id)
        .order_by(File.created_at.desc())
        .all()
    )
    return jsonify([x.to_dict() for x in files])


@bp.get("/files/<int:file_id>/view")
def view_file(file_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    rec = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not rec:
        return jsonify(error="file not found"), 404

    if not os.path.exists(rec.storage_path):
        return jsonify(error="file missing on disk"), 500

    return send_file(
        rec.storage_path,
        mimetype=rec.mime_type,
        as_attachment=False,
        download_name=rec.name,
    )


@bp.patch("/files/<int:file_id>")
def rename_file(file_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    rec = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not rec:
        return jsonify(error="file not found"), 404

    data = request.get_json(silent=True) or {}
    raw_name = (data.get("name") or "").strip()
    if not raw_name:
        return jsonify(error="name is required"), 400

    name = secure_filename(raw_name)
    if not name:
        return jsonify(error="invalid name"), 400

    if not name.lower().endswith(".pdf"):
        return jsonify(error="only .pdf names are allowed"), 400

    if len(name) > 255:
        return jsonify(error="name is too long"), 400

    name = _unique_file_name(user_id, name, rec.folder_id, exclude_id=rec.id)

    rec.name = name
    db.session.commit()
    return jsonify(rec.to_dict()), 200


@bp.delete("/files/<int:file_id>")
def delete_file(file_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    rec = File.query.filter_by(id=file_id, user_id=user_id).first()
    if not rec:
        return jsonify(error="file not found"), 404

    try:
        if os.path.exists(rec.storage_path):
            os.remove(rec.storage_path)
    except OSError:
        return jsonify(error="failed to delete file from disk"), 500

    db.session.delete(rec)
    db.session.commit()

    return jsonify(status="ok")