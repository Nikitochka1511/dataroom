import os
from flask import Blueprint, jsonify, request, send_file, current_app
from werkzeug.utils import secure_filename

from ..db import db
from ..models import Folder, File
from ..services.file_storage import validate_pdf, save_pdf

bp = Blueprint("files", __name__)

@bp.post("/files/upload")
def upload_file():
    # multipart/form-data: file + folder_id
    folder_id = request.form.get("folder_id", type=int)
    f = request.files.get("file")

    if not folder_id:
        return jsonify(error="folder_id is required"), 400
    if not f:
        return jsonify(error="file is required"), 400

    folder = Folder.query.get(folder_id)
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

    rec = File(
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
    folder = Folder.query.get(folder_id)
    if not folder:
        return jsonify(error="folder not found"), 404

    files = File.query.filter_by(folder_id=folder_id).order_by(File.created_at.desc()).all()
    return jsonify([x.to_dict() for x in files])

@bp.get("/files/<int:file_id>/view")
def view_file(file_id: int):
    rec = File.query.get(file_id)
    if not rec:
        return jsonify(error="file not found"), 404

    if not os.path.exists(rec.storage_path):
        return jsonify(error="file missing on disk"), 500


    return send_file(rec.storage_path, mimetype=rec.mime_type, as_attachment=False, download_name=rec.name)

@bp.patch("/files/<int:file_id>")
def rename_file(file_id: int):
    rec = File.query.get(file_id)
    if not rec:
        return jsonify(error="file not found"), 404

    data = request.get_json(silent=True) or {}
    raw_name = (data.get("name") or "").strip()
    if not raw_name:
        return jsonify(error="name is required"), 400

    # sanitize display name (this does NOT rename the disk file)
    name = secure_filename(raw_name)
    if not name:
        return jsonify(error="invalid name"), 400

    # enforce .pdf for consistency
    if not name.lower().endswith(".pdf"):
        return jsonify(error="only .pdf names are allowed"), 400

    if len(name) > 255:
        return jsonify(error="name is too long"), 400

    # avoid duplicates inside the same folder
    exists = (
        File.query
        .filter(File.folder_id == rec.folder_id, File.name == name, File.id != rec.id)
        .first()
    )
    if exists:
        return jsonify(error="file with this name already exists in this folder"), 409

    rec.name = name
    db.session.commit()
    return jsonify(rec.to_dict()), 200    

@bp.delete("/files/<int:file_id>")
def delete_file(file_id: int):
    rec = File.query.get(file_id)
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
