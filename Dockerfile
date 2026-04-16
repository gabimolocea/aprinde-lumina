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

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Copy React build — Whitenoise will serve it at the root (/, /assets/*, etc.)
COPY --from=frontend-builder /app/dist ./frontend_dist

EXPOSE 8000

CMD ["./entrypoint.sh"]
