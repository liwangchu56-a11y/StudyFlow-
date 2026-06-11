"""知识点 (长期记忆) API 测试."""
import pytest


@pytest.mark.asyncio
async def test_create_concept_manual(client):
    r = await client.post(
        "/api/concepts",
        json={"name": "闭包", "description": "函数 + 引用环境", "category": "Python"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "闭包"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_bulk_create_concepts(client):
    items = [
        {"name": "闭包", "description": "..."},
        {"name": "装饰器", "description": "..."},
        {"name": "生成器", "description": "..."},
    ]
    r = await client.post("/api/concepts/bulk", json=items)
    assert r.status_code == 201
    assert len(r.json()) == 3


@pytest.mark.asyncio
async def test_list_concepts_筛选(client):
    await client.post("/api/concepts", json={"name": "闭包", "description": "x", "category": "Python"})
    await client.post("/api/concepts", json={"name": "二叉树", "description": "y", "category": "算法"})

    r = await client.get("/api/concepts?category=Python")
    assert len(r.json()) == 1

    r2 = await client.get("/api/concepts?q=二叉")
    assert len(r2.json()) == 1


@pytest.mark.asyncio
async def test_update_concept(client):
    r = await client.post("/api/concepts", json={"name": "闭包", "description": "x"})
    cid = r.json()["id"]
    r2 = await client.patch(f"/api/concepts/{cid}", json={"name": "Python 闭包", "concept_group": "Python 基础"})
    assert r2.status_code == 200
    assert r2.json()["name"] == "Python 闭包"
    assert r2.json()["concept_group"] == "Python 基础"


@pytest.mark.asyncio
async def test_delete_concept(client):
    r = await client.post("/api/concepts", json={"name": "X", "description": "Y"})
    cid = r.json()["id"]
    r2 = await client.delete(f"/api/concepts/{cid}")
    assert r2.status_code == 204
    r3 = await client.get("/api/concepts")
    assert all(c["id"] != cid for c in r3.json())


@pytest.mark.asyncio
async def test_list_groups(client):
    await client.post("/api/concepts", json={"name": "A", "description": "a", "concept_group": "Python"})
    await client.post("/api/concepts", json={"name": "B", "description": "b", "concept_group": "Python"})
    await client.post("/api/concepts", json={"name": "C", "description": "c", "concept_group": "算法"})
    r = await client.get("/api/concepts/groups")
    assert sorted(r.json()) == ["Python", "算法"]


@pytest.mark.asyncio
async def test_reorganize_未配置LLM_返回_503(client, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None
    r = await client.post("/api/concepts/reorganize")
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_reorganize_空_返回空结果(client, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None
    r = await client.post("/api/concepts/reorganize")
    assert r.status_code == 200
    data = r.json()
    assert data["groups"] == []
    assert data["duplicates"] == []


@pytest.mark.asyncio
async def test_reorganize_成功(client, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None
    from app.routers import concepts as concepts_router

    # 建几个概念
    c1 = (await client.post("/api/concepts", json={"name": "闭包", "description": "x"})).json()
    c2 = (await client.post("/api/concepts", json={"name": "装饰器", "description": "y"})).json()
    c3 = (await client.post("/api/concepts", json={"name": "二叉树", "description": "z"})).json()

    # mock LLM
    async def fake_reorganize(concepts):
        return {
            "duplicates": [[c1["id"], c2["id"]]],
            "groups": [
                {"group": "Python", "description": "Python 概念", "concept_ids": [c1["id"], c2["id"]]},
                {"group": "算法", "description": "算法", "concept_ids": [c3["id"]]},
            ],
            "suggested_renames": [
                {"id": c1["id"], "new_name": "Python 闭包", "reason": "更清晰"},
            ],
        }

    monkeypatch.setattr(concepts_router, "reorganize_concepts", fake_reorganize)

    r = await client.post("/api/concepts/reorganize")
    assert r.status_code == 200
    data = r.json()
    assert len(data["groups"]) == 2
    assert len(data["duplicates"]) == 1
    assert len(data["suggested_renames"]) == 1


@pytest.mark.asyncio
async def test_apply_reorganize_改名_分组_归档(client):
    c1 = (await client.post("/api/concepts", json={"name": "A", "description": "a"})).json()
    c2 = (await client.post("/api/concepts", json={"name": "B", "description": "b"})).json()
    c3 = (await client.post("/api/concepts", json={"name": "C", "description": "c"})).json()

    payload = {
        "groups": [{"group": "G1", "description": None, "concept_ids": [c1["id"], c2["id"]]}],
        "suggested_renames": [{"id": c1["id"], "new_name": "A 重命名", "reason": None}],
        "duplicates": [[c2["id"], c3["id"]]],  # c3 重复, archive
    }
    r = await client.post("/api/concepts/apply-reorganize", json=payload)
    assert r.status_code == 200
    assert r.json()["affected"] >= 3

    # 验证: active 列表里 c1 改名+分组, c3 已归档
    active = {c["id"]: c for c in (await client.get("/api/concepts?status=active")).json()}
    archived = {c["id"]: c for c in (await client.get("/api/concepts?status=archived")).json()}
    assert active[c1["id"]]["name"] == "A 重命名"
    assert active[c1["id"]]["concept_group"] == "G1"
    assert c3["id"] in archived
    assert archived[c3["id"]]["status"] == "archived"