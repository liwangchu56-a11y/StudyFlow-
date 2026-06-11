"""FastAPI 依赖注入."""
from app.db import get_session  # re-export

__all__ = ["get_session"]
