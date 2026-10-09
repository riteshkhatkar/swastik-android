# Run Crater (Billing) with Docker

When users click **Payment & Billing** on the Swastik Hospital app, Crater opens in a new tab. Crater must be running (e.g. via Docker) and the URL set in `.env`.

---

## Option 1: Official Crater with Docker Compose (recommended)

### 1. Clone Crater

```bash
git clone https://github.com/crater-invoice/crater.git
cd crater
```

### 2. Start Crater with Docker

```bash
docker-compose up -d
```

This starts:

- **app** – PHP application  
- **db** – MariaDB (user: `crater`, password: `crater`, database: `crater`)  
- **nginx** – Web server (default port **80**)  
- **cron** – Scheduled tasks  

### 3. Open Crater

- In browser: **http://localhost** (or **http://localhost:80**).
- First time: complete Crater’s setup wizard (admin user, company, etc.).

### 4. Point the Swastik app to Crater

In the **frontend** project `.env`:

```env
REACT_APP_CRATER_URL=http://localhost
```

Restart the React app (`npm start`). Clicking **Payment & Billing** will open Crater in a new tab.

### 5. Stop Crater

```bash
cd crater
docker-compose down
```

---

## Option 2: Pre-built Docker image (e.g. jee-r/crater)

If you use a pre-built image like `j33r/crater` or `ghcr.io/jee-r/crater:dev`:

1. Run the container with the port you choose (e.g. **8080**).
2. In frontend `.env` set:

   ```env
   REACT_APP_CRATER_URL=http://localhost:8080
   ```

3. Restart the React app. Click **Payment & Billing** to open Crater in a new tab.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Clone Crater repo and run `docker-compose up -d` (or run a Crater Docker image). |
| 2 | Open Crater in the browser (e.g. http://localhost) and complete setup. |
| 3 | Set `REACT_APP_CRATER_URL` in frontend `.env` to that URL. |
| 4 | Restart the React app; clicking **Payment & Billing** opens Crater in a new tab. |

**Note:** If Crater runs on port 80, use `http://localhost`. If it runs on another port (e.g. 8080), use `http://localhost:8080`.

---

## Troubleshooting

### Error: "Failed to open stream: vendor/autoload.php - No such file or directory"

You see: `require(/var/www/public/../vendor/autoload.php): Failed to open stream` or `Fatal error: Failed opening required ... vendor/autoload.php`. Crater’s Composer dependencies are missing.

**Quick fix (Docker):**

1. Open a terminal and go to the **Crater** project folder (the one where you ran `docker-compose up`), e.g.:
   ```bash
   cd path/to/crater
   ```

2. Install dependencies inside the app container (try `app` first):
   ```bash
   docker-compose exec app composer install
   ```

3. If that fails with “no such service”, list services:
   ```bash
   docker-compose ps
   ```
   Use the name of the **PHP/app** service (often `app`, `php`, or `web`) in place of `app`:
   ```bash
   docker-compose exec php composer install
   ```
   or
   ```bash
   docker-compose exec web composer install
   ```

4. Reload **http://localhost** in the browser. Crater should load and show the setup wizard.

**Fix when using Docker Compose (official Crater repo):**

1. From the **crater** project folder (where you ran `docker-compose up`), run:

   ```bash
   docker-compose exec app composer install
   ```

   If your service name is different (e.g. `php` or `web`), use that instead of `app`.

2. Refresh **http://localhost** in the browser. Crater should load and show the setup wizard.

**If you're not using Docker** (e.g. PHP on Windows):

1. Install [Composer](https://getcomposer.org/).
2. In the Crater project root (where `composer.json` is), run:

   ```bash
   composer install
   ```

3. Reload Crater in the browser.

**If the error persists:** Ensure the container has the Crater source code and that the web root is correct. With the official `docker-compose`, the first build usually runs `composer install` in the Dockerfile; if you mounted a local folder over the app code, run `composer install` inside the container as above.

---

### 500 Server Error (after composer install)

If **http://localhost** shows a blank page or "500 SERVER ERROR", Laravel/Crater needs config and setup.

**Run these from the Crater folder** (e.g. `frontend\crater`) in order:

1. **Create `.env` from example** (if you don’t have `.env` in the crater folder):
   ```bash
   copy .env.example .env
   ```
   Then edit `.env` and set:
   - `APP_URL=http://localhost`
   - Keep `DB_HOST=db`, `DB_DATABASE=crater`, `DB_USERNAME=crater`, `DB_PASSWORD=crater` (must match your `docker-compose` db service).

2. **Generate app key and run setup inside the app container:**
   ```bash
   docker-compose exec app php artisan key:generate
   docker-compose exec app php artisan migrate --force
   docker-compose exec app php artisan storage:link
   ```

3. **Fix permissions** (inside the container, so Laravel can write to `storage` and `bootstrap/cache`):
   ```bash
   docker-compose exec app chmod -R 775 storage bootstrap/cache
   docker-compose exec app chown -R www-data:www-data storage bootstrap/cache
   ```
   If `chown` fails (e.g. on Windows), skip it; `chmod` is often enough.

4. **Refresh** http://localhost. You should see the Crater setup wizard or login.

**If 500 persists:** Check Laravel logs inside the container:
   ```bash
   docker-compose exec app cat storage/logs/laravel.log
   ```
   The last lines usually show the real error (e.g. database connection, missing env).
