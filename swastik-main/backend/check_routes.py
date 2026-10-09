
import sys
from pathlib import Path

# Ensure backend root is on path
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

try:
    from app.main import app
    print("\nREGISTERED ROUTES:")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = getattr(route, "methods", "[]")
            print(f"{list(methods)} {route.path}")
except Exception as e:
    print(f"ERROR: {e}")
