import os
import uuid

def ensure_storage_dir(storage_dir: str) -> None:
    os.makedirs(storage_dir, exist_ok=True)

def validate_pdf(file_storage) -> None:
    # 1) mime-type (з браузера)
    if (file_storage.mimetype or "").lower() != "application/pdf":
        raise ValueError("Only PDF files are allowed")

    # 2) сигнатура файла "%PDF-"
    pos = file_storage.stream.tell()
    head = file_storage.stream.read(5)
    file_storage.stream.seek(pos)
    if head != b"%PDF-":
        raise ValueError("Invalid PDF signature")

def save_pdf(file_storage, storage_dir: str) -> tuple[str, int]:
    """
    Returns (storage_path, size_bytes)
    """
    ensure_storage_dir(storage_dir)

    ext = ".pdf"
    filename = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(storage_dir, filename)

    file_storage.save(full_path)
    size = os.path.getsize(full_path)

    # зберігаємо в БД відносний шлях
    return full_path, size