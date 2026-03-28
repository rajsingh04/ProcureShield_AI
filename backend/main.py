from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, OAuthError
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
import shutil
import os
from backend.services.pipeline import run_pipeline
from backend.services.qdrant_service import init_qdrant
from backend.services.qdrant_service import search_vector

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

def create_jwt(user_info: dict):
    payload = {
        "sub": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@app.on_event("startup")
async def startup():
    init_qdrant()
    


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
        # Redirect back to frontend login page with JWT token
        return RedirectResponse(f"{FRONTEND_URL}/login/callback?token={jwt_token}")
    
    raise HTTPException(status_code=400, detail="Could not fetch user info")

STORAGE_DIR = "backend/storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to ProcureShield AI API"}

@app.get("/search")
def search(q: str):
    return search_vector(q)

@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}")
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail=f"Only Excel and CSV files are supported, got {file.filename}")
        
    file_location = os.path.join(STORAGE_DIR, file.filename)
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    try:
        results = run_pipeline(file_location, STORAGE_DIR)
        return {"status": "success", "data": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
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
