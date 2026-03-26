from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
from backend.services.pipeline import run_pipeline

app = FastAPI(title="ProcureShield AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = "backend/storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Welcome to ProcureShield AI API"}

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
