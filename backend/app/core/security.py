import os
from pathlib import Path
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings, BASE_DIR

_KEY_FILE = Path(BASE_DIR) / ".encryption_key"


def _load_or_create_key() -> bytes:
    """
    Resolution order:
    1. ENCRYPTION_KEY env var (Render/hosted deployments)
    2. backend/.encryption_key file (local dev persistence)
    3. Generate a new key and persist it to the file
    """
    env_key = os.environ.get("ENCRYPTION_KEY", "").strip()
    if env_key:
        return env_key.encode()

    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()

    new_key = Fernet.generate_key()
    _KEY_FILE.write_bytes(new_key)
    try:
        _KEY_FILE.chmod(0o600)
    except OSError:
        pass
    return new_key


@lru_cache(maxsize=1)
def get_fernet() -> Fernet:
    return Fernet(_load_or_create_key())


def encrypt_secret(plain: str) -> str:
    return get_fernet().encrypt(plain.encode()).decode()


def decrypt_secret(token: str) -> str:
    return get_fernet().decrypt(token.encode()).decode()
