# Make sure Celery app is loaded when Django starts
from config.celery_app import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
