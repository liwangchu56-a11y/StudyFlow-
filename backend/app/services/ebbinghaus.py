"""艾宾浩斯复习间隔算法: 等级 0..5 对应 1/3/7/15/30/60 天."""
from datetime import datetime, timedelta
from typing import Tuple

MAX_MASTERY = 5

# 等级 -> 间隔天数
INTERVALS = [1, 3, 7, 15, 30, 60]


def interval_for_mastery(mastery: int) -> int:
    """根据 mastery 返回间隔天数, 超过上限取最后一级."""
    idx = max(0, min(mastery, MAX_MASTERY))
    return INTERVALS[idx]


def next_review_date(now: datetime, mastery: int) -> datetime:
    """计算下次复习日期 (在 now 基础上加 interval 天)."""
    return now + timedelta(days=interval_for_mastery(mastery))


def schedule_passed(current_mastery: int, now: datetime) -> Tuple[int, int, datetime]:
    """复习通过: 等级 +1 (封顶 MAX_MASTERY), 返回 (新等级, 间隔, 下次日期)."""
    new_mastery = min(current_mastery + 1, MAX_MASTERY)
    interval = interval_for_mastery(new_mastery)
    return new_mastery, interval, now + timedelta(days=interval)


def schedule_failed(current_mastery: int, now: datetime) -> Tuple[int, int, datetime]:
    """复习未通过: 等级重置为 0, 1 天后再复习."""
    new_mastery = 0
    interval = interval_for_mastery(new_mastery)
    return new_mastery, interval, now + timedelta(days=interval)
