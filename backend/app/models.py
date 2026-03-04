from .db import db
from datetime import datetime

class Folder(db.Model):
    __tablename__ = "folders"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("folders.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "parent_id": self.parent_id}  
        

class File(db.Model):
    __tablename__ = "files"
    id = db.Column(db.Integer, primary_key=True)
    folder_id = db.Column(db.Integer, db.ForeignKey("folders.id"), nullable=False)

    name = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False, default="application/pdf")

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "folder_id": self.folder_id,
            "name": self.name,
            "size": self.size,
            "mime_type": self.mime_type,
            "created_at": self.created_at.isoformat() + "Z",
        }