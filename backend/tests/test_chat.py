"""Tests for chat message endpoints (new PostMessageOut + SSE stream)."""
import json
import os

import pytest
from unittest.mock import patch, AsyncMock

import app.services.llm as llm_mod


@pytest.fixture
def llm_enabled(monkeypatch):
    """让 LLM 客户端可用, 但所有 chat_completion* 都 mock 掉."""
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    llm_mod._client = None
    get_settings_cache_clear()
    yield
    llm_mod._client = None
    get_settings_cache_clear()


def get_settings_cache_clear():
    from app.config import get_settings
    get_settings.cache_clear()


async def _create_session(client) -> int:
    r = await client.post("/api/chat/sessions", json={})
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.mark.asyncio
async def test_post_message_returns_user_and_assistant(client, llm_enabled):
    """新契约: POST /messages 返回 {user, assistant}."""
    sid = await _create_session(client)
    with patch.object(llm_mod, "chat_completion", new=AsyncMock(return_value="hello back")):
        r = await client.post(f"/api/chat/sessions/{sid}/messages", json={"content": "hi"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user" in data and "assistant" in data
    assert data["user"]["role"] == "user"
    assert data["user"]["content"] == "hi"
    assert data["assistant"]["role"] == "assistant"
    assert data["assistant"]["content"] == "hello back"
    assert data["user"]["id"] != data["assistant"]["id"]


@pytest.mark.asyncio
async def test_post_message_persists_both_rows(client, llm_enabled):
    sid = await _create_session(client)
    with patch.object(llm_mod, "chat_completion", new=AsyncMock(return_value="x")):
        r = await client.post(f"/api/chat/sessions/{sid}/messages", json={"content": "abc"})
    assert r.status_code == 200
    r2 = await client.get(f"/api/chat/sessions/{sid}")
    msgs = r2.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user" and msgs[0]["content"] == "abc"
    assert msgs[1]["role"] == "assistant" and msgs[1]["content"] == "x"


@pytest.mark.asyncio
async def test_post_message_stream_emits_sse_events(client, llm_enabled):
    """SSE 端点应按 user -> delta* -> done 产出事件."""
    async def fake_stream(**kwargs):
        for piece in ["你", "好", "世", "界"]:
            yield piece

    sid = await _create_session(client)
    with patch.object(llm_mod, "chat_completion_stream", side_effect=fake_stream):
        r = await client.post(f"/api/chat/sessions/{sid}/messages/stream", json={"content": "hi"})
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")

    events = []
    for raw in r.text.split("\n\n"):
        raw = raw.strip()
        if not raw:
            continue
        ev = data = None
        for line in raw.split("\n"):
            if line.startswith("event: "):
                ev = line[7:].strip()
            elif line.startswith("data: "):
                data = line[6:]
        if ev and data is not None:
            events.append((ev, json.loads(data)))

    kinds = [e[0] for e in events]
    assert kinds[0] == "user"
    assert kinds[-1] == "done"
    deltas = [d for (k, d) in events if k == "delta"]
    assert len(deltas) == 4
    assert "".join(d["content"] for d in deltas) == "你好世界"
    done_data = [d for (k, d) in events if k == "done"][0]
    assert done_data["full"] == "你好世界"
    assert isinstance(done_data["id"], int)

    # AI 消息已落库
    r2 = await client.get(f"/api/chat/sessions/{sid}")
    msgs = r2.json()["messages"]
    assert len(msgs) == 2
    assert msgs[1]["content"] == "你好世界"


@pytest.mark.asyncio
async def test_post_message_stream_emits_error_on_failure(client, llm_enabled):
    async def fake_stream(**kwargs):
        raise RuntimeError("LLM 不可用")
        yield  # 标记为 async generator

    sid = await _create_session(client)
    with patch.object(llm_mod, "chat_completion_stream", side_effect=fake_stream):
        r = await client.post(f"/api/chat/sessions/{sid}/messages/stream", json={"content": "hi"})
    assert r.status_code == 200
    events = []
    for raw in r.text.split("\n\n"):
        raw = raw.strip()
        if not raw:
            continue
        ev = data = None
        for line in raw.split("\n"):
            if line.startswith("event: "):
                ev = line[7:].strip()
            elif line.startswith("data: "):
                data = line[6:]
        if ev and data is not None:
            events.append((ev, json.loads(data)))
    assert any(k == "error" for (k, _) in events)
