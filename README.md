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

### 1.2 Vector DB (Qdrant) — setup and how to view data

The project uses Qdrant as a vector store for invoice embeddings. The backend reads `QDRANT_URL` and `QDRANT_API_KEY` from the environment and will call `init_qdrant()` on startup to create/reset the `invoice_vectors` collection defined in `backend/services/qdrant_service.py`.

Local quickstart (Docker):

```bash
# Run Qdrant HTTP server (default port 6333)
docker run -p 6333:6333 qdrant/qdrant:latest

# (Optional) Run Qdrant UI to inspect collections and points at http://localhost:6334
docker run -p 6334:6334 qdrant/qdrant-ui:latest
```

Environment variables (add to your `.env`):

```env
QDRANT_URL=http://localhost:6333
# If you run a local instance without API key, leave QDRANT_API_KEY empty or omit it
QDRANT_API_KEY=
```

How the backend initializes the collection:

- On FastAPI startup `backend/main.py` calls `init_qdrant()` which recreates the collection named `invoice_vectors` with vector size 384 and cosine distance (see `backend/services/qdrant_service.py`).

How to inspect Qdrant data and collections

1. Using the Qdrant UI (recommended):
   - Open `http://localhost:6334` (if you started the `qdrant-ui` container).
   - You can view collections, their schema, and sample points directly in the UI.

2. Using the REST API (curl):
   - List collections:

```bash
curl http://localhost:6333/collections
```

3. Using the Python client (REPL or script):

```python
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")

# List collections
print(client.get_collections())

# Get collection info
print(client.get_collection(collection_name="invoice_vectors"))

# Scroll points (paginated)
for page in client.scroll(collection_name="invoice_vectors", limit=100):
    print(page)
```

4. Querying/searching embeddings

- The backend exposes a simple search endpoint at `/search?q=your query` which uses the same `qdrant_client` to embed the query and return the top matches (see `backend/main.py` and `backend/services/qdrant_service.py`).

Notes and troubleshooting

- If `init_qdrant()` recreates the collection on startup, existing points in that collection will be removed. Remove or modify the call in `backend/main.py` if you want to keep persisted vectors between restarts.
- If you use Qdrant Cloud, set `QDRANT_URL` to the cloud endpoint and set `QDRANT_API_KEY` accordingly.
- Ensure your firewall or Docker networking allows access to the Qdrant ports (`6333` for API, `6334` for UI when using the UI container).

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
