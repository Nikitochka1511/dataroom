from .db import db

class Folder(db.Model):
    __tablename__ = "folders"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("folders.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "parent_id": self.parent_id}  