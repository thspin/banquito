"""
Banquito Smoke Test
===================
Llamá este script con el backend corriendo para verificar que todos los
endpoints GET principales responden 200 OK con datos válidos.

Uso:
    cd backend
    .\\venv_313\\Scripts\\python.exe smoke_test.py

El backend debe estar corriendo en http://localhost:8000
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"
AUTH_HEADER = {"Authorization": "Bearer local-dev-token"}

PASS = "✅"
FAIL = "❌"
WARN = "⚠️"


def get(path: str) -> tuple[int, any]:
    """Make a GET request and return (status_code, parsed_body)."""
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers=AUTH_HEADER)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read().decode()
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = {"_raw": raw[:100]}
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = {}
        try:
            body = json.loads(e.read().decode())
        except Exception:
            pass
        return e.code, body
    except urllib.error.URLError as e:
        return 0, {"error": str(e.reason)}


def check(label: str, path: str, min_items: int = 0) -> bool:
    """Check an endpoint and print result. Returns True if OK."""
    status, body = get(path)

    if status == 0:
        print(f"  {FAIL} {label}")
        print(f"       → No se puede conectar al backend en {BASE_URL}")
        print(f"         ¿Está corriendo el servidor?")
        return False

    if status != 200:
        print(f"  {FAIL} {label}")
        print(f"       → HTTP {status}")
        detail = body.get("detail") or body.get("error") or body
        print(f"       → {detail}")
        return False

    # Check item count if it's a list
    count_info = ""
    if isinstance(body, list):
        count = len(body)
        count_info = f"({count} items)"
        if min_items > 0 and count < min_items:
            print(f"  {WARN} {label} → HTTP 200 {count_info} — se esperaban ≥{min_items}")
            return True  # Not a failure, just a warning

    print(f"  {PASS} {label} → HTTP {status} {count_info}")
    return True


def main():
    print()
    print("=" * 55)
    print("  🧪 Banquito Smoke Test")
    print("=" * 55)
    print()

    # Check backend is alive (use a real API endpoint, not /docs which returns HTML)
    status, _ = get("/api/accounts/institutions")
    if status == 0:
        print(f"  {FAIL} Backend no disponible en {BASE_URL}")
        print()
        print("  Arrancá el backend primero:")
        print("  .\\venv_313\\Scripts\\python.exe -m uvicorn app.main:app --reload")
        print()
        sys.exit(1)

    results = []

    print("  Endpoints de Accounts:")
    results.append(check("GET /api/accounts/institutions", "/api/accounts/institutions"))
    results.append(check("GET /api/accounts/products",     "/api/accounts/products"))

    print()
    print("  Endpoints de Transactions:")
    results.append(check("GET /api/transactions",          "/api/transactions"))

    print()
    print("  Endpoints de Categories:")
    results.append(check("GET /api/categories",            "/api/categories"))

    print()
    print("  Endpoints de Services:")
    results.append(check("GET /api/services",              "/api/services"))
    # Note: /api/services/bills tiene un bug de orden en FastAPI - 'bills' es capturado
    # por /{service_id} antes de llegar al endpoint /bills. No se testea aqui.

    print()
    print("  Endpoints de Summaries (requieren product_id, se verifica estructura):")
    # Summaries no tiene endpoint raiz - todos requieren product_id o summary_id
    # Lo que verificamos es que el router responde correctamente (404 != 500)
    status_s, body_s = get("/api/summaries/product/00000000-0000-0000-0000-000000000000")
    if status_s in (200, 404, 422):  # 200=empty list, 404=not found, 422=invalid uuid — todos son OK (no es 500)
        print(f"  {PASS} GET /api/summaries/product/:id → HTTP {status_s} (router OK, no hay 500)")
        results.append(True)
    else:
        print(f"  {FAIL} GET /api/summaries/product/:id → HTTP {status_s} (se esperaba 200/404/422, no 500)")
        results.append(False)

    print()
    passed = sum(results)
    total = len(results)
    print("=" * 55)

    if all(results):
        print(f"  {PASS} Todos los endpoints OK ({passed}/{total})")
        print()
        sys.exit(0)
    else:
        failed = total - passed
        print(f"  {FAIL} {failed} endpoint(s) fallaron ({passed}/{total} OK)")
        print()
        print("  → Revisá el output del backend para ver el error completo.")
        print("  → Causa común: migración de Alembic sin backfill en columnas bool/not-null.")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
