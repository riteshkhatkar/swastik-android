# How to Run Swastik Hospital Project

This project has a **backend** (FastAPI + MongoDB) and a **frontend** (React). Run both for the full application.

---

## Prerequisites

- **Node.js** (v16 or later) and **npm** – for the frontend
- **Python 3.10+** – for the backend
- **MongoDB** – use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or a local MongoDB instance

---

## 1. Backend

### Setup

```bash
cd backend
python -m venv .venv
```

**Activate the virtual environment:**

- **Windows (PowerShell):**  
  `.venv\Scripts\Activate.ps1`
- **Windows (Command Prompt):**  
  `.venv\Scripts\activate.bat`
- **Mac/Linux:**  
  `source .venv/bin/activate`

### Install dependencies

```bash
pip install -r requirements.txt
```

### Environment variables

Create a `.env` file in the `backend` folder (or copy from `.env.example` if present):

- `MONGO_URI` – MongoDB connection string (e.g. Atlas URI; use `%40` for `@` in password)
- `DB_NAME` – Database name (default: `swastik_hospital`)
- `SECRET_KEY` – JWT secret key
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` – optional, for payment gateway

### Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

- **API:** http://localhost:8000  
- **Docs:** http://localhost:8000/docs  

**Default login (if seeded):** `admin` / `admin123`

---

## 2. Frontend

### Setup and run

```bash
cd frontend
npm install
npm start
```

The app opens at **http://localhost:3000**.

### Optional: API URL

If the backend runs on a different host/port, set in `frontend/.env`:

- `REACT_APP_API_URL=http://localhost:8000`

---

## 3. Run both (two terminals)

**Terminal 1 – Backend:**

```bash
cd backend
.venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 – Frontend:**

```bash
cd frontend
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Quick reference

| Part      | Command / URL                          |
|----------|----------------------------------------|
| Backend  | `uvicorn app.main:app --reload --port 8000` |
| Frontend | `npm start`                            |
| App      | http://localhost:3000                  |
| API docs | http://localhost:8000/docs             |
