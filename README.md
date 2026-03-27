# ProcureShield AI

ProcureShield AI is an intelligent anomaly detection and financial dashboard system designed for procurement and invoice analysis. It utilizes a Python machine learning backend combined with a modern React frontend to automatically process invoice datasets, identify financial irregularities, and visualize risk distribution.

## Features

- **Automated Anomaly Detection**: Parses raw Excel/CSV invoice datasets to detect non-compliant entries.
- **Risk Scoring Engine**: Flags Duplicate Invoices, Rate Mismatches, Ghost Invoices (Vendor not recognized / No matching PO), and 3-Way Match failures.
- **Financial Impact Dashboard**: Provides clean, dark-themed visualizations indicating processed amounts, at-risk capital, and amounts saved.
- **Dataset Insights**: Auto-generates dataset summary components dynamically reading from backend ground truth parameters.
- **Flagged Invoices View**: A scrollable sticky-header table explicitly highlighting rows that require manual intervention.
- **Detailed Reporting**: Exports comprehensive flagged issue datasets via generated Excel sheets directly from the API.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Custom CSS (Dark Theme UI)
- **Backend**: FastAPI, Python 3.12, Pandas, scikit-learn, openpyxl

---

## How to Run the Project

The application requires both the FastAPI backend and the React frontend to run simultaneously. 

### 1. Backend Setup

The backend handles the data pipeline, anomaly rules engine, database, and image generation.

1. Navigate to the project root directory.
2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv env
   source env/bin/activate

   # On Windows:
   python -m venv env
   .\env\Scripts\activate
   ```
3. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will run on `http://localhost:8000`.*

### 1.1 Database Configuration (PostgreSQL)

The backend uses PostgreSQL to store login logs and upload history. Connection settings are read from environment variables via `backend/config.py` using `python-dotenv`.

1. **Install PostgreSQL locally** (if not already installed).
2. **Create a database and user** (you can also reuse the default `postgres` user):
   ```bash
   # Open psql as a superuser
   psql -U postgres

   -- Create database (name should match DB_NAME)
   CREATE DATABASE procure_db;

   -- Optional: create a dedicated app user
   CREATE USER procure_user WITH PASSWORD 'strong_password_here';
   GRANT ALL PRIVILEGES ON DATABASE procure_db TO procure_user;
   ```
3. **Create a `.env` file in the project root** (same folder as `backend/` and `src/`) with database variables. Example:
   ```env
   # PostgreSQL connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=procure_db
   DB_USER=procure_user   # or postgres
   DB_PASSWORD=strong_password_here
   ```
   These values map directly to `DB_CONFIG` in `backend/config.py`.
4. **Start the backend** (`uvicorn main:app --reload` from inside `backend/`). On startup the app will:
   - Attempt to connect to PostgreSQL using `DB_*` variables.
   - Automatically create the required tables (`user_login_logs`, `file_upload_metadata`) via `init_database()` if the user has permission.

If the database connection fails, check:
- PostgreSQL is running and listening on the host/port you configured.
- The user/password are correct and have privileges on the database.
- The `.env` file is present in the project root and the terminal is started from that root when running the backend.

### 2. Frontend Setup

The frontend serves the interactive data dashboard and file uploader.

1. Open a new terminal and navigate to the project root directory.
2. Install the necessary Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically run at `http://localhost:5173`. Click the link in the terminal to open the UI in your browser.*

---

## How it works
1. **Upload Phase**: A specialized procurement dataset (e.g., invoices) is passed via the frontend.
2. **Analysis Pipeline**: The Python `pipeline.py` engine executes data-cleaning, verifies values against cross-references (like approved POs/Rates), assigns a 0-100 risk score, and assigns categories like "Auto Approve", "Manual Review", or "Auto Hold".
3. **Data Rendering**: The React frontend pulls this curated metadata, separating raw metrics, dynamically formatting them (Crores & Lakhs), parsing dataset properties, and appending the generated charts to the presentation layer without caching limits.
