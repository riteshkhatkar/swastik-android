# Run backend with reload, excluding .venv so changes in site-packages don't trigger restart
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 --reload-exclude ".venv"
