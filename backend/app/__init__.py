from flask import Flask, jsonify
from flask_cors import CORS

from .db import db
from .routes.folders import bp as folders_bp

from .routes.files import bp as files_bp
import os

def create_app():
    app = Flask(__name__)
    app.config["STORAGE_DIR"] = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "storage")
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dataroom.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    app.register_blueprint(folders_bp)
    app.register_blueprint(files_bp)

    return app