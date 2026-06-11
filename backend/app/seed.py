"""启动种子: 写入默认 app_settings (id=1)."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AppSettings


async def ensure_default_settings(session: Optional[AsyncSession] = None) -> None:
    """确保 settings 单行存在; 不存在则插入默认值."""
    from app.db import AsyncSessionLocal

    own_session = session is None
    if own_session:
        session = AsyncSessionLocal()
    try:
        existing = await session.get(AppSettings, 1)
        if existing is None:
            session.add(AppSettings(id=1))
            await session.commit()
    finally:
        if own_session and session is not None:
            await session.close()
