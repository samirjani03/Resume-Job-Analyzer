import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
db_path = BASE_DIR / "backend" / "talentmatch.db"

if os.path.exists(db_path):
    try:
        os.remove(db_path)
        print(f"Successfully deleted old database at {db_path}")
    except Exception as e:
        print(f"Could not remove DB file directly: {e}")
else:
    print("Database file does not exist yet.")
