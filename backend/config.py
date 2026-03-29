"""
Database Configuration for ProcureShield AI
Edit this file to change database settings
"""

import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables from .env as early as possible so
# modules that import this file get the overridden values.
load_dotenv()

# Support a full DATABASE_URL (Neon, Heroku-style) or individual parts.
# Priority: `DATABASE_URL` -> `DB_HOST` (can be full URL) -> individual vars.
database_url = os.getenv("DATABASE_URL") or os.getenv("DB_HOST")

def _parse_database_url(url: str):
    parsed = urlparse(url)
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/") or os.getenv("DB_NAME", "procure_db"),
        "user": parsed.username,
        "password": parsed.password,
        "raw_url": url,
    }

if database_url and ("://" in database_url):
    DB_CONFIG = _parse_database_url(database_url)
else:
    DB_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "database": os.getenv("DB_NAME", "procure_db"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres_password"),
    }

STORAGE_CONFIG = {
    "upload_dir": "backend/storage",
    "allowed_extensions": [".xlsx", ".xls", ".csv"],
    "max_file_size_mb": 50,
}
