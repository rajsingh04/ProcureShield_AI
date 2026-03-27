"""
Database Configuration for ProcureShield AI
Edit this file to change database settings
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env as early as possible so
# modules that import this file get the overridden values.
load_dotenv()

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
