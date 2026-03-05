from flask import Flask, jsonify
from flask_cors import CORS
import os

from .db import db

from .routes.folders import bp as folders_bp
from .routes.files import bp as files_bp
from .routes.google_auth import bp as google_auth_bp
from .routes.drive import bp as drive_bp

def create_app():
    app = Flask(__name__)

    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    app.config["STORAGE_DIR"] = os.path.join(BASE_DIR, "storage")

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
    app.register_blueprint(google_auth_bp)
    app.register_blueprint(drive_bp)
    return app