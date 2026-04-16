from .base import *
import os
from pathlib import Path

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]

# Automatically allow Railway's public domain (injected by Railway)
_railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")
if _railway_domain and _railway_domain not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_railway_domain)

# Automatically allow DigitalOcean App Platform domain
_do_domain = os.environ.get("APP_DOMAIN", "")
if _do_domain and _do_domain not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_do_domain)

# Serve React SPA — Whitenoise serves frontend_dist/ at the URL root
# Only set WHITENOISE_ROOT if the directory exists (multi-stage Docker build)
_frontend_dist = BASE_DIR / "frontend_dist"
if _frontend_dist.exists():
    WHITENOISE_ROOT = _frontend_dist
    TEMPLATES[0]["DIRS"] = [_frontend_dist]

CORS_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

# Railway PostgreSQL — supports DATABASE_URL (preferred) or individual PG* vars
import urllib.parse as _urlparse

_database_url = os.environ.get("DATABASE_URL", "")
if _database_url:
    _u = _urlparse.urlparse(_database_url)
    _ssl = dict(_urlparse.parse_qsl(_u.query))
    _db_opts = {}
    if _ssl.get("sslmode"):
        _db_opts["sslmode"] = _ssl["sslmode"]
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _u.path.lstrip("/"),
            "USER": _u.username,
            "PASSWORD": _u.password,
            "HOST": _u.hostname,
            "PORT": str(_u.port or 5432),
            "OPTIONS": _db_opts,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("PGDATABASE", os.environ.get("DB_NAME", "aprinde_lumina")),
            "USER": os.environ.get("PGUSER", os.environ.get("DB_USER", "postgres")),
            "PASSWORD": os.environ.get("PGPASSWORD", os.environ.get("DB_PASSWORD", "")),
            "HOST": os.environ.get("PGHOST", os.environ.get("DB_HOST", "localhost")),
            "PORT": os.environ.get("PGPORT", os.environ.get("DB_PORT", "5432")),
        }
    }

# Security
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Whitenoise compressed static files
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
