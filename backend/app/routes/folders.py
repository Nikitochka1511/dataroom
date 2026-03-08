from flask import Blueprint, jsonify, request, session

from ..db import db
from ..models import Folder
from ..services.folder_tree import build_folder_tree
from ..services.folder_delete import delete_folder_cascade

bp = Blueprint("folders", __name__)


def _require_user_id():
    user_id = session.get("user_id")
    if not user_id:
        return None, (jsonify(error="unauthorized"), 401)
    return user_id, None


def _unique_folder_name(
    user_id: int,
    base_name: str,
    parent_id: int | None,
    exclude_id: int | None = None,
) -> str:
    candidate = base_name
    i = 1

    while True:
        q = Folder.query.filter(
            Folder.user_id == user_id,
            Folder.name == candidate,
        )

        if parent_id is None:
            q = q.filter(Folder.parent_id.is_(None))
        else:
            q = q.filter(Folder.parent_id == parent_id)

        if exclude_id is not None:
            q = q.filter(Folder.id != exclude_id)

        exists = q.first()
        if not exists:
            return candidate

        candidate = f"{base_name} ({i})"
        i += 1


@bp.post("/folders")
def create_folder():
    user_id, err = _require_user_id()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    parent_id = data.get("parent_id", None)

    if not name:
        return jsonify(error="name is required"), 400

    if parent_id is not None:
        parent = Folder.query.filter_by(id=parent_id, user_id=user_id).first()
        if not parent:
            return jsonify(error="parent folder not found"), 404

    name = _unique_folder_name(user_id, name, parent_id)

    if len(name) > 255:
        return jsonify(error="name is too long"), 400

    if "/" in name or "\\" in name:
        return jsonify(error="invalid folder name"), 400

    folder = Folder(user_id=user_id, name=name, parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()
    return jsonify(folder.to_dict()), 201


@bp.patch("/folders/<int:folder_id>")
def rename_folder(folder_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="name is required"), 400

    if len(name) > 255:
        return jsonify(error="name is too long"), 400

    if "/" in name or "\\" in name:
        return jsonify(error="invalid folder name"), 400

    name = _unique_folder_name(user_id, name, folder.parent_id, exclude_id=folder.id)

    folder.name = name
    db.session.commit()
    return jsonify(folder.to_dict()), 200


@bp.get("/folders/<int:folder_id>/path")
def folder_path(folder_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    path = []
    current = folder

    while current is not None:
        path.append(current.to_dict())
        if current.parent_id is None:
            break
        current = Folder.query.filter_by(id=current.parent_id, user_id=user_id).first()

    path.reverse()
    return jsonify(path)


@bp.get("/folders/tree")
def folders_tree():
    user_id, err = _require_user_id()
    if err:
        return err

    folders = Folder.query.filter_by(user_id=user_id).all()
    return jsonify(build_folder_tree(folders))


@bp.delete("/folders/<int:folder_id>")
def delete_folder(folder_id):
    user_id, err = _require_user_id()
    if err:
        return err

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    try:
        delete_folder_cascade(user_id, folder_id)
        return jsonify(ok=True, deleted_folder_id=folder_id), 200
    except Exception:
        db.session.rollback()
        return jsonify(error="failed to delete folder"), 500


@bp.get("/folders/<int:folder_id>/children")
def list_children(folder_id):
    user_id, err = _require_user_id()
    if err:
        return err

    if folder_id == 0:
        children = Folder.query.filter(
            Folder.user_id == user_id,
            Folder.parent_id.is_(None),
        ).all()
        return jsonify([c.to_dict() for c in children])

    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify(error="folder not found"), 404

    children = Folder.query.filter_by(parent_id=folder_id, user_id=user_id).all()
    return jsonify([c.to_dict() for c in children])