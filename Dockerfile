# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
# VITE_API_BASE_URL="" → relative URLs (/api/...) — same domain as Django
RUN npm run build

# ── Stage 2: Django + serve everything ────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy React build — Whitenoise will serve it at the root (/, /assets/*, etc.)
COPY --from=frontend-builder /app/dist ./frontend_dist

EXPOSE 8000

# Wait for DB, migrate, collect static, then start gunicorn + hourly expire loop
CMD python -c "
import time, os, psycopg2, urllib.parse as p
url = os.environ.get('DATABASE_URL','')
if url:
    u = p.urlparse(url)
    for i in range(30):
        try:
            psycopg2.connect(dbname=u.path.lstrip('/'), user=u.username, password=u.password, host=u.hostname, port=u.port or 5432)
            break
        except Exception as e:
            print(f'DB not ready ({i+1}/30):', e)
            time.sleep(2)
" && \
    python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput && \
    (while true; do python manage.py expire_candles; sleep 3600; done) & \
    gunicorn config.wsgi:application \
      --bind 0.0.0.0:${PORT:-8000} \
      --workers 2 \
      --timeout 60 \
      --access-logfile -
