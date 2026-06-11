"""统计聚合查询."""
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import QACard, StudySession, Todo


def _today_range_utc() -> tuple:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


def _day_key(dt: datetime) -> str:
    return dt.date().isoformat()


async def compute_stats(session: AsyncSession) -> Dict:
    today_start, now = _today_range_utc()

    # 今日学习秒数
    today_sec_q = select(func.coalesce(func.sum(StudySession.duration_sec), 0)).where(
        StudySession.started_at >= today_start
    )
    today_sec = int((await session.execute(today_sec_q)).scalar() or 0)

    # 今日番茄数 (focus_count 累计)
    today_pomo_q = select(func.coalesce(func.sum(StudySession.focus_count), 0)).where(
        StudySession.started_at >= today_start,
        StudySession.mode == "pomodoro",
    )
    today_pomo = int((await session.execute(today_pomo_q)).scalar() or 0)

    # 总学习秒数 + 总番茄数
    total_sec = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(StudySession.duration_sec), 0))
            )
        ).scalar()
        or 0
    )
    total_focus = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(StudySession.focus_count), 0)).where(
                    StudySession.mode == "pomodoro"
                )
            )
        ).scalar()
        or 0
    )

    # 知识点数 (distinct tag 不为空的卡片数) + 问答卡总数
    card_total = int(
        (await session.execute(select(func.count(QACard.id)))).scalar() or 0
    )
    knowledge_q = select(func.count(QACard.tag)).where(QACard.tag.isnot(None))
    knowledge = int((await session.execute(knowledge_q)).scalar() or 0)

    # 待办未完成
    pending_todos = int(
        (
            await session.execute(
                select(func.count(Todo.id)).where(Todo.completed.is_(False))
            )
        ).scalar()
        or 0
    )

    # 连续学习天数: 从今天往回数, 只要有学习就算 1 天, 遇到空缺停止
    # 查询所有有学习的日期 (去重), 用 set 加速判断
    all_days_q = select(func.date(StudySession.started_at)).where(
        StudySession.duration_sec > 0
    )
    days_set: set = {row[0] for row in (await session.execute(all_days_q)).all()}

    streak = 0
    cursor = today_start.date()
    if _day_key_from_date(cursor) in days_set:
        while _day_key_from_date(cursor) in days_set:
            streak += 1
            cursor = cursor - timedelta(days=1)
    else:
        # 今日未学, 看昨天及之前: 仅当昨日及更早连续学, 才显示 streak (否则 0)
        cursor = cursor - timedelta(days=1)
        while _day_key_from_date(cursor) in days_set:
            streak += 1
            cursor = cursor - timedelta(days=1)

    return {
        "today_minutes": today_sec // 60,
        "today_pomodoros": today_pomo,
        "total_minutes": total_sec // 60,
        "total_focus_sessions": total_focus,
        "streak_days": streak,
        "knowledge_points": knowledge,
        "total_cards": card_total,
        "pending_todos": pending_todos,
    }


def _day_key_from_date(d) -> str:
    return d.isoformat()
