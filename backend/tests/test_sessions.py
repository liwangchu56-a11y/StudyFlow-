"""Sessions 端点测试."""
import pytest


@pytest.mark.asyncio
async def test_create_and_get_session(client):
    payload = {
        "mode": "pomodoro",
        "started_at": "2026-06-10T10:00:00Z",
        "ended_at": "2026-06-10T10:25:00Z",
        "duration_sec": 1500,
        "focus_count": 1,
        "note": "学习 Python 装饰器",
        "summary": "理解了闭包和 wraps",
    }
    r = await client.post("/api/sessions", json=payload)
    assert r.status_code == 201
    sid = r.json()["id"]
    r2 = await client.get(f"/api/sessions/{sid}")
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_create_session_附带_auto_qa_自动建卡(client):
    payload = {
        "mode": "free",
        "started_at": "2026-06-10T10:00:00Z",
        "ended_at": "2026-06-10T10:30:00Z",
        "duration_sec": 1800,
        "focus_count": 0,
        "auto_qa": [
            {"question": "Q1", "answer": "A1", "tag": "Python"},
            {"question": "Q2", "answer": "A2"},
        ],
    }
    r = await client.post("/api/sessions", json=payload)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_sessions_按时间倒序(client):
    for i in range(3):
        await client.post("/api/sessions", json={
            "mode": "free",
            "started_at": f"2026-06-1{i}T10:00:00Z",
            "ended_at": f"2026-06-1{i}T11:00:00Z",
            "duration_sec": 3600,
        })
    r = await client.get("/api/sessions")
    data = r.json()
    assert len(data) == 3
    assert data[0]["started_at"] > data[-1]["started_at"]


@pytest.mark.asyncio
async def test_patch_session_更新笔记(client):
    r = await client.post("/api/sessions", json={
        "mode": "free",
        "started_at": "2026-06-10T10:00:00Z",
        "ended_at": "2026-06-10T10:30:00Z",
        "duration_sec": 1800,
    })
    sid = r.json()["id"]
    r2 = await client.patch(f"/api/sessions/{sid}", json={"note": "新笔记"})
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_delete_session(client):
    r = await client.post("/api/sessions", json={
        "mode": "free",
        "started_at": "2026-06-10T10:00:00Z",
        "ended_at": "2026-06-10T10:30:00Z",
        "duration_sec": 1800,
    })
    sid = r.json()["id"]
    r2 = await client.delete(f"/api/sessions/{sid}")
    assert r2.status_code == 204
    r3 = await client.get(f"/api/sessions/{sid}")
    assert r3.status_code == 404