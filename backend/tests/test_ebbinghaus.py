"""TDD: 艾宾浩斯复习间隔算法."""
from datetime import datetime, timedelta, timezone

from app.services.ebbinghaus import (
    MAX_MASTERY,
    interval_for_mastery,
    next_review_date,
    schedule_passed,
    schedule_failed,
)


def test_interval_for_mastery_各等级():
    assert interval_for_mastery(0) == 1
    assert interval_for_mastery(1) == 3
    assert interval_for_mastery(2) == 7
    assert interval_for_mastery(3) == 15
    assert interval_for_mastery(4) == 30
    assert interval_for_mastery(5) == 60
    assert interval_for_mastery(99) == 60  # 上限


def test_max_mastery_为5():
    assert MAX_MASTERY == 5


def test_next_review_date_加_interval_天():
    today = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    nxt = next_review_date(today, mastery=2)  # 间隔 7 天
    assert nxt == datetime(2026, 6, 17, 12, 0, tzinfo=timezone.utc)


def test_schedule_passed_通过后_等级递增_并返回_next():
    today = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
    new_mastery, interval, nxt = schedule_passed(current_mastery=0, now=today)
    assert new_mastery == 1
    assert interval == 3
    assert nxt == datetime(2026, 6, 13, 9, 0, tzinfo=timezone.utc)


def test_schedule_passed_已达_上限_不再递增():
    today = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
    new_mastery, interval, nxt = schedule_passed(current_mastery=5, now=today)
    assert new_mastery == 5
    assert interval == 60
    assert nxt == datetime(2026, 8, 9, 9, 0, tzinfo=timezone.utc)


def test_schedule_failed_不通过_重置回0_并_1天后复习():
    today = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
    new_mastery, interval, nxt = schedule_failed(current_mastery=3, now=today)
    assert new_mastery == 0
    assert interval == 1
    assert nxt == datetime(2026, 6, 11, 9, 0, tzinfo=timezone.utc)
