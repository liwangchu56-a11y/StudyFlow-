"""Stats 聚合测试."""
import pytest


async def _add_session(client, started, duration_sec, mode="free", focus_count=0):
    from datetime import datetime, timedelta
    start = datetime.fromisoformat(started.replace("Z", "+00:00"))
    end = start + timedelta(seconds=duration_sec)
    return await client.post("/api/sessions", json={
        "mode": mode,
        "started_at": start.isoformat(),
        "ended_at": end.isoformat(),
        "duration_sec": duration_sec,
        "focus_count": focus_count,
    })


@pytest.mark.asyncio
async def test_stats_空状态(client):
    r = await client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["today_minutes"] == 0
    assert data["streak_days"] == 0
    assert data["total_cards"] == 0


@pytest.mark.asyncio
async def test_stats_今日分钟数(client):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)
    await _add_session(client, today.isoformat().replace("+00:00", "Z"), duration_sec=1500)
    r = await client.get("/api/stats")
    data = r.json()
    assert data["today_minutes"] >= 25


@pytest.mark.asyncio
async def test_stats_番茄数(client):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)
    ts = today.isoformat().replace("+00:00", "Z")
    await _add_session(client, ts, duration_sec=1500, mode="pomodoro", focus_count=1)
    await _add_session(client, ts, duration_sec=1500, mode="pomodoro", focus_count=1)
    r = await client.get("/api/stats")
    assert r.json()["today_pomodoros"] >= 2


@pytest.mark.asyncio
async def test_stats_连续天数(client):
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)
    for offset in range(3):
        day = (today - timedelta(days=offset)).isoformat().replace("+00:00", "Z")
        await _add_session(client, day, duration_sec=600)
    r = await client.get("/api/stats")
    assert r.json()["streak_days"] >= 3


@pytest.mark.asyncio
async def test_stats_连续天数_中断清零(client):
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)
    two_days_ago = (today - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    await _add_session(client, two_days_ago, duration_sec=600)
    r = await client.get("/api/stats")
    assert r.json()["streak_days"] == 0


@pytest.mark.asyncio
async def test_daily_trend_返回7天(client):
    r = await client.get("/api/stats/trend?days=7")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 7


@pytest.mark.asyncio
async def test_stats_卡数_和_待办(client):
    await client.post("/api/cards", json={"question": "Q1", "answer": "A1"})
    await client.post("/api/cards", json={"question": "Q2", "answer": "A2", "tag": "Tag1"})
    await client.post("/api/todos", json={"title": "T1"})
    await client.post("/api/todos", json={"title": "T2"})
    r = await client.get("/api/stats")
    data = r.json()
    assert data["total_cards"] == 2
    assert data["knowledge_points"] == 1
    assert data["pending_todos"] == 2