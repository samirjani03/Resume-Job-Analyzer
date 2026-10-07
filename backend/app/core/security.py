import os
from pathlib import Path
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings, BASE_DIR

# ENCRYPTION_KEY_FILE lets Docker mount the key file on a persistent volume
# (default: backend/.encryption_key for local dev).
_KEY_FILE = Path(os.environ.get("ENCRYPTION_KEY_FILE") or (Path(BASE_DIR) / ".encryption_key"))


def _load_or_create_key() -> bytes:
    """
    Resolution order:
    1. ENCRYPTION_KEY env var (Render/hosted deployments)
    2. ENCRYPTION_KEY_FILE / backend/.encryption_key (local dev + Docker volume)
    3. Generate a new key and persist it to the file
    """
    env_key = os.environ.get("ENCRYPTION_KEY", "").strip()
    if env_key:
        return env_key.encode()

    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()

    new_key = Fernet.generate_key()
    _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
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
