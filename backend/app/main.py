"""FastAPI 应用入口."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers import (
    cards,
    chat,
    concepts,
    sessions,
    settings as settings_router,
    stats,
    summaries,
    todos,
)
from app.schemas import HealthResp

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("studyflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from app.seed import ensure_default_settings
    await ensure_default_settings()
    cfg = get_settings()
    log.info("ai_enabled=%s", cfg.ai_enabled)
    yield


app = FastAPI(title="StudyFlow API", version="0.2.0", lifespan=lifespan)

cfg = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResp)
async def health():
    return HealthResp(ai_enabled=cfg.ai_enabled)


app.include_router(sessions.router)
app.include_router(summaries.router)
app.include_router(cards.router)
app.include_router(todos.router)
app.include_router(settings_router.router)
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(concepts.router)