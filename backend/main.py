from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, OAuthError
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
import shutil
import os
import logging
from backend.services.pipeline import run_pipeline
from backend.database import init_database, check_connection, log_login, log_logout, save_file_metadata, update_file_metadata, get_upload_history
from backend.config import STORAGE_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="ProcureShield AI API")

app.add_middleware(
    SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "super-secret-session-key")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JWT_SECRET = os.getenv("JWT_SECRET", "jwt-super-secret-key")

# Initialize database on startup
try:
    if check_connection():
        init_database()
        logger.info("Database initialized successfully")
    else:
        logger.warning("Database not connected - logs will not be saved")
except Exception as e:
    logger.warning(f"Database initialization skipped: {e}")

def create_jwt(user_info: dict):
    payload = {
        "sub": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_client_ip(request: Request) -> str:
    """Extracts client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def verify_jwt(token: str) -> dict:
    """Verifies and decodes a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/auth/login")
async def login(request: Request):
    """Initiates the Google OAuth flow"""
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/api/auth/callback")
async def auth_callback(request: Request):
    """Handles the callback from Google"""
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as error:
        raise HTTPException(status_code=400, detail=error.error)

    user = token.get('userinfo')
    if user:
        jwt_token = create_jwt(user)
        # Log login to database (non-blocking, won't fail auth if it fails)
        try:
            log_login(
                user_info=user,
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("User-Agent", "")[:500] if request.headers.get("User-Agent") else None,
                session_token=jwt_token
            )
        except Exception as e:
            logger.warning(f"Could not log login: {e}")
        # Redirect back to frontend login page with JWT token
        return RedirectResponse(f"{FRONTEND_URL}/login/callback?token={jwt_token}")

    raise HTTPException(status_code=400, detail="Could not fetch user info")

STORAGE_DIR = STORAGE_CONFIG["upload_dir"]
os.makedirs(STORAGE_DIR, exist_ok=True)

@app.get("/")
def read_root():
    db_status = "connected" if check_connection() else "disconnected"
    return {"message": "Welcome to ProcureShield AI API", "database": db_status}


@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...), authorization: str = Header(None)):
    """Analyzes uploaded file and saves metadata to database."""
    print(f"Received file: {file.filename}")

    # Extract user email from token if available
    user_email = "anonymous@unknown"
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            payload = verify_jwt(token)
            user_email = payload.get("sub", user_email)
    except Exception:
        pass  # Continue without authentication

    # Validate file
    if not file.filename or not any(file.filename.endswith(ext) for ext in STORAGE_CONFIG["allowed_extensions"]):
        raise HTTPException(status_code=400, detail=f"Only {', '.join(STORAGE_CONFIG['allowed_extensions'])} files are supported")

    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    max_size = STORAGE_CONFIG["max_file_size_mb"] * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"File size exceeds {STORAGE_CONFIG['max_file_size_mb']}MB limit")

    # Determine file type
    file_type = "unknown"
    if file.filename.endswith('.xlsx'):
        file_type = "xlsx"
    elif file.filename.endswith('.xls'):
        file_type = "xls"
    elif file.filename.endswith('.csv'):
        file_type = "csv"

    file_location = os.path.join(STORAGE_DIR, file.filename)
    metadata_id = -1

    try:
        # Save uploaded file
        try:
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

        # Save file metadata before processing
        db_saved = False
        try:
            metadata_id = save_file_metadata(
                user_email=user_email,
                filename=file.filename,
                file_size_bytes=file_size,
                file_type=file_type,
                storage_path=file_location
            )
            if metadata_id and metadata_id > 0:
                db_saved = True
                try:
                    update_file_metadata(metadata_id, processing_status='processing')
                except Exception as e:
                    logger.warning(f"Could not update initial metadata status: {e}")
            else:
                logger.warning(f"save_file_metadata returned invalid id: {metadata_id}")
        except Exception as e:
            logger.warning(f"Could not save file metadata: {e}")

        # Run pipeline
        results = run_pipeline(file_location, STORAGE_DIR)

        # Extract stats for metadata
        stats = results.get("stats", {})
        flagged_count = len(results.get("flaggedInvoices", []))
        risk_scores = [inv.get('risk_score', 0) for inv in results.get("flaggedInvoices", []) if inv.get('risk_score')]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0

        # Update metadata after processing (only if initial save succeeded)
        try:
            if db_saved and metadata_id and metadata_id > 0:
                update_file_metadata(
                    metadata_id=metadata_id,
                    processing_status='completed',
                    processing_message='Successfully processed',
                    total_invoices=stats.get('totalInvoices', 0),
                    flagged_invoices=flagged_count,
                    risk_score_avg=round(avg_risk, 2),
                    report_path=os.path.join(STORAGE_DIR, 'ProcureShield_AI_Report.xlsx'),
                    chart_path=os.path.join(STORAGE_DIR, 'risk_score_distribution.png')
                )
            else:
                logger.warning('Skipping post-processing DB update because initial metadata save failed')
        except Exception as e:
            logger.warning(f"Could not update file metadata: {e}")

        return {"status": "success", "data": results, "metadata_id": (metadata_id if metadata_id and metadata_id > 0 else None), "db_saved": db_saved}

    except HTTPException:
        if metadata_id > 0:
            try:
                update_file_metadata(metadata_id, processing_status='failed', processing_message='File validation failed')
            except Exception:
                pass
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        if metadata_id > 0:
            try:
                update_file_metadata(metadata_id, processing_status='failed', processing_message=str(e))
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@app.get("/api/reports/download")
async def download_report():
    report_path = os.path.join(STORAGE_DIR, "ProcureShield_AI_Report.xlsx")
    if os.path.exists(report_path):
        return FileResponse(
            report_path,
            filename="ProcureShield_AI_Report.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    raise HTTPException(status_code=404, detail="Report not generated yet")

@app.get("/api/charts/{chart_name}")
async def get_chart(chart_name: str):
    chart_path = os.path.join(STORAGE_DIR, chart_name)
    if os.path.exists(chart_path):
        return FileResponse(chart_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Chart not found")


@app.get("/api/uploads/history")
async def uploads_history(authorization: str = Header(None), limit: int = 20, offset: int = 0):
    """Returns upload history for the authenticated user."""
    user_email = None
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            payload = verify_jwt(token)
            user_email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        history = get_upload_history(user_email, limit=limit, offset=offset)
        return {"status": "success", "history": history}
    except Exception as e:
        logger.error(f"Failed to fetch upload history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch upload history")
