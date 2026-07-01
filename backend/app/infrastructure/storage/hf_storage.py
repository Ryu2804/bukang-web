import uuid
from pathlib import Path

from huggingface_hub import batch_bucket_files

from app.config import settings


class StorageService:
    def __init__(self):
        self.bucket_name = settings.hf_storage_repo
        self.token = settings.hf_token
        self._hf_enabled = bool(self.bucket_name and self.token)
        self._upload_dir = "uploads"

    def upload_photo(self, file_content: bytes, filename: str) -> str:
        if self._hf_enabled:
            return self._upload_to_hf(file_content, filename)
        return self._upload_local(file_content, filename)

    def _upload_to_hf(self, file_content: bytes, filename: str) -> str:
        ext = Path(filename).suffix or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        path_in_bucket = f"uploads/{unique_name}"

        batch_bucket_files(
            self.bucket_name,
            add=[(file_content, path_in_bucket)],
            token=self.token,
        )

        return f"https://huggingface.co/buckets/{self.bucket_name}/resolve/{path_in_bucket}"

    def _upload_local(self, file_content: bytes, filename: str) -> str:
        import os

        os.makedirs(self._upload_dir, exist_ok=True)
        ext = Path(filename).suffix or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(self._upload_dir, unique_name)
        with open(path, "wb") as f:
            f.write(file_content)
        return f"/uploads/{unique_name}"


storage_service = StorageService()
