"""Cards + 艾宾浩斯复习队列测试."""
import pytest


@pytest.mark.asyncio
async def test_create_card_basic(client):
    r = await client.post("/api/cards", json={"question": "什么是闭包", "answer": "函数 + 引用环境", "tag": "Python"})
    assert r.status_code == 201
    data = r.json()
    assert data["mastery"] == 0
    assert data["tag"] == "Python"


@pytest.mark.asyncio
async def test_review_passed_推进等级(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    r2 = await client.post(f"/api/cards/{cid}/review", json={"passed": True})
    assert r2.status_code == 200
    data = r2.json()
    assert data["mastery"] == 1
    assert data["interval_days"] == 3
    assert data["next_review_at"] is not None
    assert data["last_reviewed_at"] is not None


@pytest.mark.asyncio
async def test_review_failed_重置为0(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    for _ in range(3):
        await client.post(f"/api/cards/{cid}/review", json={"passed": True})
    r2 = await client.post(f"/api/cards/{cid}/review", json={"passed": False})
    data = r2.json()
    assert data["mastery"] == 0
    assert data["interval_days"] == 1


@pytest.mark.asyncio
async def test_review_passed_封顶5级(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    for _ in range(10):
        await client.post(f"/api/cards/{cid}/review", json={"passed": True})
    cards = (await client.get("/api/cards")).json()
    card = next(c for c in cards if c["id"] == cid)
    assert card["mastery"] == 5
    assert card["interval_days"] == 60


@pytest.mark.asyncio
async def test_review_queue_包含新卡(client):
    await client.post("/api/cards", json={"question": "Q1", "answer": "A1"})
    await client.post("/api/cards", json={"question": "Q2", "answer": "A2"})
    r = await client.get("/api/cards/review")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_review_queue_排除已掌握_5级(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    for _ in range(10):
        await client.post(f"/api/cards/{cid}/review", json={"passed": True})
    r2 = await client.get("/api/cards/review")
    assert all(c["id"] != cid for c in r2.json())


@pytest.mark.asyncio
async def test_filter_cards_by_tag_and_mastery(client):
    await client.post("/api/cards", json={"question": "Q1", "answer": "A1", "tag": "Go"})
    await client.post("/api/cards", json={"question": "Q2", "answer": "A2", "tag": "Py"})
    r = await client.get("/api/cards?tag=Py")
    assert len(r.json()) == 1
    assert r.json()[0]["tag"] == "Py"


@pytest.mark.asyncio
async def test_update_card_favorited(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    r2 = await client.patch(f"/api/cards/{cid}", json={"favorited": True})
    assert r2.json()["favorited"] is True


@pytest.mark.asyncio
async def test_delete_card(client):
    r = await client.post("/api/cards", json={"question": "Q", "answer": "A"})
    cid = r.json()["id"]
    r2 = await client.delete(f"/api/cards/{cid}")
    assert r2.status_code == 204
    r3 = await client.get("/api/cards")
    assert all(c["id"] != cid for c in r3.json())