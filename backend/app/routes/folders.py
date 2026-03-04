from flask import Blueprint, jsonify, request
from ..db import db
from ..models import Folder
from ..services.folder_tree import build_folder_tree

bp = Blueprint("folders", __name__)

@bp.post("/folders")
def create_folder():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    parent_id = data.get("parent_id", None)

    if not name:
        return jsonify(error="name is required"), 400

    if parent_id is not None:
        parent = Folder.query.get(parent_id)
        if not parent:
            return jsonify(error="parent folder not found"), 404

    folder = Folder(name=name, parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify(folder.to_dict()), 201

@bp.get("/folders/tree")
def folders_tree():
    folders = Folder.query.all()
    return jsonify(build_folder_tree(folders))