"""Settings 测试."""
import pytest


@pytest.mark.asyncio
async def test_get_default_settings(client):
    r = await client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert data["focus_min"] == 25
    assert data["short_break_min"] == 5
    assert data["long_break_min"] == 15
    assert data["long_break_interval"] == 4
    assert data["ai_enabled"] is False


@pytest.mark.asyncio
async def test_update_settings(client):
    r = await client.put("/api/settings", json={"focus_min": 30, "short_break_min": 6})
    assert r.status_code == 200
    data = r.json()
    assert data["focus_min"] == 30
    assert data["short_break_min"] == 6
    assert data["long_break_min"] == 15


@pytest.mark.asyncio
async def test_update_settings_校验边界(client):
    r = await client.put("/api/settings", json={"focus_min": 0})
    assert r.status_code == 422
    r2 = await client.put("/api/settings", json={"long_break_interval": 100})
    assert r2.status_code == 422