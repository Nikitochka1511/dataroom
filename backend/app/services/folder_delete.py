import os
from ..models import Folder, File
from ..db import db


def collect_child_folder_ids(folder_id):
    """
    Збирає всі вкладені папки рекурсивно
    """
    ids = [folder_id]

    children = Folder.query.filter_by(parent_id=folder_id).all()

    for child in children:
        ids.extend(collect_child_folder_ids(child.id))

    return ids


def delete_folder_cascade(folder_id):
    """
    Каскадно видаляє:
    - всі вкладені папки
    - всі файли в них
    - файли з диска
    """

    folder_ids = collect_child_folder_ids(folder_id)

    files = File.query.filter(File.folder_id.in_(folder_ids)).all()

    for file in files:
        try:
            if os.path.exists(file.storage_path):
                os.remove(file.storage_path)
        except Exception:
            pass

        db.session.delete(file)

    folders = Folder.query.filter(Folder.id.in_(folder_ids)).all()

    for folder in folders:
        db.session.delete(folder)

    db.session.commit()