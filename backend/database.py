"""
Database module for ProcureShield AI
Handles PostgreSQL connection and session management
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Optional
import logging

from backend.config import DB_CONFIG

logger = logging.getLogger(__name__)


def get_connection():
    """Creates a new database connection."""
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database=DB_CONFIG["database"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
        )
        return conn
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise Exception(f"Failed to connect to database: {e}")


@contextmanager
def get_db_connection() -> Generator:
    """Context manager for database connections with auto commit/rollback."""
    conn = None
    try:
        conn = get_connection()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()


@contextmanager
def get_db_cursor() -> Generator:
    """Context manager for database cursor with auto cleanup."""
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cur
        finally:
            cur.close()


def init_database() -> bool:
    """Creates database tables if they don't exist."""
    try:
        # Create database if not exists
        try:
            conn = psycopg2.connect(
                host=DB_CONFIG["host"],
                port=DB_CONFIG["port"],
                database="postgres",
                user=DB_CONFIG["user"],
                password=DB_CONFIG["password"],
            )
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_CONFIG['database']}'")
            if not cur.fetchone():
                cur.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
                logger.info(f"Created database: {DB_CONFIG['database']}")
            cur.close()
            conn.close()
        except Exception as e:
            logger.warning(f"Could not create database: {e}")

        # Create tables
        with get_db_connection() as conn:
            cur = conn.cursor()

            # User Login Logs Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_login_logs (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255),
                    picture TEXT,
                    login_provider VARCHAR(50) DEFAULT 'google',
                    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    logout_at TIMESTAMP,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    session_token TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # File Upload Metadata Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS file_upload_metadata (
                    id SERIAL PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    filename VARCHAR(500) NOT NULL,
                    file_size_bytes BIGINT,
                    file_type VARCHAR(50),
                    storage_path TEXT,
                    upload_status VARCHAR(50) DEFAULT 'pending',
                    processing_status VARCHAR(50) DEFAULT 'pending',
                    processing_message TEXT,
                    total_invoices INTEGER,
                    flagged_invoices INTEGER,
                    risk_score_avg FLOAT,
                    report_path TEXT,
                    chart_path TEXT,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_email) REFERENCES user_login_logs(email) ON DELETE CASCADE
                )
            """)

            # Create indexes
            cur.execute("CREATE INDEX IF NOT EXISTS idx_login_logs_email ON user_login_logs(email)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON user_login_logs(login_at)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_upload_logs_user_email ON file_upload_metadata(user_email)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_upload_logs_uploaded_at ON file_upload_metadata(uploaded_at)")

            conn.commit()
            cur.close()
            logger.info("Database tables initialized successfully")
            return True

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False


def check_connection() -> bool:
    """Checks if database connection is working."""
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            return True
    except Exception:
        return False


# =============================================================================
# Login Log Functions
# =============================================================================

def log_login(user_info: dict, ip_address: str = None, user_agent: str = None, session_token: str = None) -> bool:
    """
    Logs a user login to the database.
    Args:
        user_info: dict with email, name, picture keys
        ip_address: client IP address
        user_agent: browser user agent string
        session_token: JWT token string
    Returns:
        True if successful, False otherwise
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO user_login_logs
                (email, name, picture, login_provider, ip_address, user_agent, session_token, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    picture = EXCLUDED.picture,
                    login_at = CURRENT_TIMESTAMP,
                    logout_at = NULL,
                    session_token = EXCLUDED.session_token,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                user_info.get("email"),
                user_info.get("name"),
                user_info.get("picture"),
                "google",
                ip_address,
                user_agent,
                session_token,
                True
            ))
            logger.info(f"Login logged for user: {user_info.get('email')}")
            return True
    except Exception as e:
        logger.error(f"Failed to log login: {e}")
        return False


def log_logout(email: str) -> bool:
    """
    Logs a user logout to the database.
    Args:
        email: user's email address
    Returns:
        True if successful, False otherwise
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE user_login_logs
                SET logout_at = CURRENT_TIMESTAMP,
                    is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = %s AND is_active = TRUE
            """, (email,))
            logger.info(f"Logout logged for user: {email}")
            return True
    except Exception as e:
        logger.error(f"Failed to log logout: {e}")
        return False


# =============================================================================
# File Upload Metadata Functions
# =============================================================================

def save_file_metadata(
    user_email: str,
    filename: str,
    file_size_bytes: int,
    file_type: str,
    storage_path: str
) -> int:
    """
    Saves file upload metadata to the database.
    Args:
        user_email: email of the user who uploaded
        filename: original filename
        file_size_bytes: size of file in bytes
        file_type: file extension type (xlsx, csv, etc)
        storage_path: where file is stored
    Returns:
        metadata ID if successful, -1 otherwise
    """
    try:
        with get_db_cursor() as cur:
            # Ensure the user exists in user_login_logs so the FK constraint is satisfied.
            # If the user record does not exist, create a minimal stub row. Use ON CONFLICT DO NOTHING
            # to avoid race conditions.
            try:
                cur.execute(
                    """
                    INSERT INTO user_login_logs (email, name, is_active)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, user_login_logs.name)
                    """,
                    (user_email, None),
                )
            except Exception as e:
                logger.debug(f"Could not ensure user exists before saving metadata: {e}")

            cur.execute("""
                INSERT INTO file_upload_metadata
                (user_email, filename, file_size_bytes, file_type, storage_path, upload_status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (user_email, filename, file_size_bytes, file_type, storage_path, 'uploaded'))
            result = cur.fetchone()
            metadata_id = result['id'] if result else -1
            logger.info(f"File metadata saved with ID: {metadata_id}")
            return metadata_id
    except Exception as e:
        logger.error(f"Failed to save file metadata: {e}")
        return -1


def update_file_metadata(
    metadata_id: int,
    processing_status: str = None,
    processing_message: str = None,
    total_invoices: int = None,
    flagged_invoices: int = None,
    risk_score_avg: float = None,
    report_path: str = None,
    chart_path: str = None
) -> bool:
    """
    Updates file upload metadata after processing.
    Args:
        metadata_id: ID returned from save_file_metadata
        processing_status: 'processing', 'completed', 'failed'
        processing_message: status message or error
        total_invoices: count of invoices processed
        flagged_invoices: count of flagged invoices
        risk_score_avg: average risk score
        report_path: path to generated report
        chart_path: path to generated chart
    Returns:
        True if successful, False otherwise
    """
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()

            update_fields = ["processed_at = CURRENT_TIMESTAMP", "updated_at = CURRENT_TIMESTAMP"]
            values = []

            if processing_status:
                update_fields.append("processing_status = %s")
                values.append(processing_status)
            if processing_message:
                update_fields.append("processing_message = %s")
                values.append(processing_message)
            if total_invoices is not None:
                update_fields.append("total_invoices = %s")
                values.append(total_invoices)
            if flagged_invoices is not None:
                update_fields.append("flagged_invoices = %s")
                values.append(flagged_invoices)
            if risk_score_avg is not None:
                update_fields.append("risk_score_avg = %s")
                values.append(risk_score_avg)
            if report_path:
                update_fields.append("report_path = %s")
                values.append(report_path)
            if chart_path:
                update_fields.append("chart_path = %s")
                values.append(chart_path)

            values.append(metadata_id)

            query = f"UPDATE file_upload_metadata SET {', '.join(update_fields)} WHERE id = %s"
            cur.execute(query, tuple(values))
            conn.commit()
            cur.close()
            logger.info(f"File metadata updated for ID: {metadata_id}")
            return True
    except Exception as e:
        logger.error(f"Failed to update file metadata: {e}")
        return False


def get_upload_history(user_email: str, limit: int = 20, offset: int = 0) -> dict:
    """
    Gets upload history for a user.
    Args:
        user_email: email to filter by
        limit: max records to return
        offset: records to skip
    Returns:
        dict with uploads list and total count
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT id, filename, file_size_bytes, file_type, upload_status,
                       processing_status, total_invoices, flagged_invoices,
                       risk_score_avg, uploaded_at, processed_at
                FROM file_upload_metadata
                WHERE user_email = %s
                ORDER BY uploaded_at DESC
                LIMIT %s OFFSET %s
            """, (user_email, limit, offset))
            uploads = cur.fetchall()

            cur.execute("SELECT COUNT(*) FROM file_upload_metadata WHERE user_email = %s", (user_email,))
            total = cur.fetchone()['count']

            return {
                "uploads": uploads,
                "total": total,
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        logger.error(f"Failed to get upload history: {e}")
        return {"uploads": [], "total": 0, "limit": limit, "offset": offset}
