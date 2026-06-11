"""学后总结 + 问答卡 AI 提炼端点 (mocked)."""
import pytest

from app.schemas import QACase


@pytest.mark.asyncio
async def test_summarize_成功(client, monkeypatch):
    """通过替换路由模块中的 summarize 引用让 endpoint 使用 fake."""
    from app.routers import summaries as summaries_router
    from app.config import get_settings

    monkeypatch.setenv("LLM_API_KEY", "test-key")
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None

    async def fake_summarize(note, duration_sec):
        return {
            "summary": "今天学了 Python 装饰器",
            "key_points": ["闭包", "语法糖", "wraps"],
            "suggestions": ["阅读 functools 源码"],
        }

    monkeypatch.setattr(summaries_router, "summarize", fake_summarize)

    resp = await client.post(
        "/api/ai/summarize",
        json={"note": "今天学了 Python 装饰器", "duration_sec": 1500},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"] == "今天学了 Python 装饰器"
    assert data["key_points"] == ["闭包", "语法糖", "wraps"]


@pytest.mark.asyncio
async def test_summarize_未配置_返回_503(client, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None

    resp = await client.post(
        "/api/ai/summarize",
        json={"note": "hello", "duration_sec": 60},
    )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_extract_qa_成功(client, monkeypatch):
    from app.routers import summaries as summaries_router
    from app.config import get_settings

    monkeypatch.setenv("LLM_API_KEY", "test-key")
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None

    async def fake_extract(text):
        return [QACase(question="Q1", answer="A1"), QACase(question="Q2", answer="A2")]

    monkeypatch.setattr(summaries_router, "extract_qa", fake_extract)

    resp = await client.post("/api/ai/extract-qa", json={"text": "long text..."})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["cards"]) == 2


@pytest.mark.asyncio
async def test_is_available_无key_返回false(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None
    assert llm_mod.is_available() is False


@pytest.mark.asyncio
async def test_is_available_有key_返回true(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    from app.config import get_settings
    get_settings.cache_clear()
    import app.services.llm as llm_mod
    llm_mod._client = None
    assert llm_mod.is_available() is True