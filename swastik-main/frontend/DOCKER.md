# Running Swastik Hospital with Docker

## 1. Run the React frontend only

From the **project root** (`swastik-hospital`):

```bash
docker compose up --build
```

- **App:** http://localhost:3000  
- **Payment & Billing (Crater):** Set `REACT_APP_CRATER_URL=http://localhost:8080` in the root `.env` so the Billing page iframe loads Crater (Crater Docker runs on port 8080).

Stop with `Ctrl+C` or:

```bash
docker compose down
```

---

## 2. Run Crater (Payment & Billing) with Docker

Crater runs in the `crater` folder and uses its own `docker-compose.yml`.

From the **crater** directory:

```bash
cd crater
docker compose up -d
```

- **Crater app:** http://localhost:8080 (port 8080 so it doesn’t conflict with Bahmni on 80)  
- **Database:** MariaDB on port `33006` (user: `crater`, password: `crater`)

**First-time setup (after first `docker compose up`):**

```bash
cd crater
./docker-compose/setup.sh
```

Then open **http://localhost:8080** (use **HTTP**, not HTTPS) and complete Crater’s web installer.

**If the Crater UI doesn’t load (or you see Bahmni instead):**

1. Open **http://localhost:8080** — Crater runs on port 8080 so Bahmni can use port 80 or 3000.
2. Fix Crater’s `.env` (run from `crater` with containers up):
   ```bash
   docker compose exec app sh -c 'sed -i "s|APP_URL=.*|APP_URL=http://localhost:8080|" .env; sed -i "s|SESSION_DOMAIN=.*|SESSION_DOMAIN=localhost|" .env; sed -i "s|SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=localhost|" .env'
   docker compose exec app php artisan config:clear
   ```
   Then open http://localhost:8080 again. Ensure the root `.env` has `REACT_APP_CRATER_URL=http://localhost:8080` and rebuild the frontend so the Billing iframe points to Crater.

Stop Crater:

```bash
cd crater
docker compose down
```

---

## 3. Run both (frontend + Crater)

**Terminal 1 – Crater:**

```bash
cd crater
docker compose up -d
./docker-compose/setup.sh   # only first time
```

**Terminal 2 – Frontend:**

```bash
# From project root
REACT_APP_CRATER_URL=http://localhost docker compose up --build
```

- **Frontend (Bahmni):** http://localhost:3000  
- **Crater (billing):** http://localhost:8080 — use this in the Billing page iframe; set `REACT_APP_CRATER_URL=http://localhost:8080` in the root `.env`.

If the frontend container needs to open Crater on the host, use:

```bash
REACT_APP_CRATER_URL=http://host.docker.internal:8080 docker compose up --build
```

---

## Image build only (no compose)

```bash
docker build -t swastik-hospital-frontend .
docker run -p 3000:80 swastik-hospital-frontend
```

Open http://localhost:3000.
