# Swastik Hospital Backend (FastAPI + MongoDB)

## Setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

Copy or edit `.env`:

- `MONGO_URI` – MongoDB Atlas connection string (password `@` as `%40`)
- `DB_NAME` – Database name (default: `swastik_hospital`)
- `SECRET_KEY` – JWT secret
- `ACCESS_TOKEN_EXPIRE_MINUTES` – Token expiry

## Run

**Windows (recommended – avoids reloading on .venv changes):**
```powershell
.\run.ps1
```
Or:
```powershell
uvicorn app.main:app --reload --port 8000 --reload-exclude ".venv"
```

**Mac/Linux:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --reload-exclude ".venv"
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Default login

After first run, a default user is created:

- **Username:** `admin`
- **Password:** `admin123`

## API overview

- `POST /auth/login` – Login (username, password) → JWT
- `GET /auth/me` – Current user (Header: `Authorization: Bearer <token>`)
- `POST /api/patients` – Register patient (returns UHID)
- `GET /api/patients` – List patients
- `GET /api/patients/{uhid}` – Get patient by UHID
- `POST /api/opd` – OPD registration (requires UHID)
- `GET /api/opd` – List OPD
- `POST /api/ipd` – IPD registration (requires UHID)
- `GET /api/ipd` – List IPD
- `POST /api/doctors` – Register doctor
- `POST /api/staff` – Register staff
- `POST /api/appointments` – Create appointment (requires UHID)
- `GET /api/appointments` – List appointments (optional `?uhid=`)
- `GET /api/dashboard/counts` – Counts for dashboard
