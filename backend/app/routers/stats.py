"""学习统计 API."""
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_session
from app.models import QACard, StudySession, Todo
from app.services.stats import compute_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
async def get_stats(session: AsyncSession = Depends(get_session)) -> dict:
    """一次性返回统计页面所需的全部数据."""
    return await compute_stats(session)


@router.get("/trend")
async def daily_trend(
    days: int = 30,
    session: AsyncSession = Depends(get_session),
) -> List[dict]:
    """返回近 N 天每天的学习分钟数 (含零值, 按日期升序)."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    stmt = (
        select(
            func.date(StudySession.started_at).label("d"),
            func.coalesce(func.sum(StudySession.duration_sec), 0).label("sec"),
        )
        .where(StudySession.started_at >= start)
        .group_by(func.date(StudySession.started_at))
    )
    result = await session.execute(stmt)
    rows = {str(r.d): int(r.sec) for r in result}
    out = []
    for i in range(days):
        d = (start + timedelta(days=i)).date()
        sec = rows.get(str(d), 0)
        out.append({"date": d.isoformat(), "minutes": sec // 60})
    return out
