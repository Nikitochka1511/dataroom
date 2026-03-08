import os

from ..models import Folder, File
from ..db import db


def collect_child_folder_ids(user_id: int, folder_id: int):
    ids = [folder_id]

    children = Folder.query.filter_by(parent_id=folder_id, user_id=user_id).all()

    for child in children:
        ids.extend(collect_child_folder_ids(user_id, child.id))

    return ids


def delete_folder_cascade(user_id: int, folder_id: int):
    folder_ids = collect_child_folder_ids(user_id, folder_id)

    files = File.query.filter(
        File.user_id == user_id,
        File.folder_id.in_(folder_ids),
    ).all()

    for file in files:
        try:
            if os.path.exists(file.storage_path):
                os.remove(file.storage_path)
        except Exception:
            pass

        db.session.delete(file)

    folders = Folder.query.filter(
        Folder.user_id == user_id,
        Folder.id.in_(folder_ids),
    ).all()

    for folder in folders:
        db.session.delete(folder)

    db.session.commit()