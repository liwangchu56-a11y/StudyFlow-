"""Todos 测试."""
import pytest


@pytest.mark.asyncio
async def test_create_todo(client):
    r = await client.post("/api/todos", json={"title": "复习", "priority": 0})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "复习"
    assert data["priority"] == 0
    assert data["completed"] is False


@pytest.mark.asyncio
async def test_list_todos_筛选(client):
    await client.post("/api/todos", json={"title": "A", "priority": 0})
    await client.post("/api/todos", json={"title": "B", "priority": 1})

    r1 = await client.get("/api/todos")
    assert len(r1.json()) == 2

    r2 = await client.get("/api/todos?status=pending")
    assert len(r2.json()) == 2

    tid = r1.json()[0]["id"]
    await client.patch(f"/api/todos/{tid}", json={"completed": True})

    r3 = await client.get("/api/todos?status=completed")
    assert len(r3.json()) == 1
    r4 = await client.get("/api/todos?status=pending")
    assert len(r4.json()) == 1


@pytest.mark.asyncio
async def test_update_todo_completed_设置时间戳(client):
    r = await client.post("/api/todos", json={"title": "X"})
    tid = r.json()["id"]
    r2 = await client.patch(f"/api/todos/{tid}", json={"completed": True})
    assert r2.json()["completed"] is True
    assert r2.json()["completed_at"] is not None

    r3 = await client.patch(f"/api/todos/{tid}", json={"completed": False})
    assert r3.json()["completed"] is False
    assert r3.json()["completed_at"] is None


@pytest.mark.asyncio
async def test_delete_todo(client):
    r = await client.post("/api/todos", json={"title": "X"})
    tid = r.json()["id"]
    r2 = await client.delete(f"/api/todos/{tid}")
    assert r2.status_code == 204


@pytest.mark.asyncio
async def test_list_todos_优先级排序(client):
    await client.post("/api/todos", json={"title": "低", "priority": 2})
    await client.post("/api/todos", json={"title": "高", "priority": 0})
    await client.post("/api/todos", json={"title": "中", "priority": 1})
    r = await client.get("/api/todos")
    titles = [t["title"] for t in r.json()]
    assert titles == ["高", "中", "低"]