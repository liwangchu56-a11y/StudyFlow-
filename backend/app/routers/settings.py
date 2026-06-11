"""应用设置 API."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings as _get_app_settings
from app.deps import get_session
from app.models import AppSettings
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
async def get_app_settings(session: AsyncSession = Depends(get_session)):
    obj = await session.get(AppSettings, 1)
    if obj is None:
        # 理论上 lifespan 阶段已 seed, 这里兜底
        obj = AppSettings(id=1)
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
    cfg = _get_app_settings()
    return SettingsOut(
        focus_min=obj.focus_min,
        short_break_min=obj.short_break_min,
        long_break_min=obj.long_break_min,
        long_break_interval=obj.long_break_interval,
        ai_enabled=cfg.ai_enabled,
    )


@router.put("", response_model=SettingsOut)
async def update_app_settings(
    payload: SettingsUpdate,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(AppSettings, 1)
    if obj is None:
        obj = AppSettings(id=1)
        session.add(obj)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    cfg = _get_app_settings()
    return SettingsOut(
        focus_min=obj.focus_min,
        short_break_min=obj.short_break_min,
        long_break_min=obj.long_break_min,
        long_break_interval=obj.long_break_interval,
        ai_enabled=cfg.ai_enabled,
    )
