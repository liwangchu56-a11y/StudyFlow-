"""聊天会话 + 消息 API."""
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_session
from app.models import ChatMessage, ChatSession, LearnedConcept
from fastapi.responses import StreamingResponse
from app.schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    ChatSessionCreate,
    ChatSessionDetail,
    ChatSessionOut,
    ConceptOut,
    ExtractedConcept,
    PostMessageOut,
)
from app.services.llm import (
    chat_completion,
    chat_completion_stream,
    extract_concepts_from_transcript,
    is_available,
)

log = logging.getLogger("studyflow.chat")
router = APIRouter(prefix="/api/chat", tags=["chat"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _recent_concepts_text(session: AsyncSession, limit: int = 20) -> List[str]:
    """取最近 N 个 active 概念, 拼成 list[str] 给 LLM 当上下文."""
    stmt = (
        select(LearnedConcept)
        .where(LearnedConcept.status == "active")
        .order_by(LearnedConcept.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    out = []
    for c in result.scalars():
        s = f"{c.name}: {c.description}"
        if c.category:
            s = f"[{c.category}] {s}"
        out.append(s)
    return out


def _serialize_session(s: ChatSession, message_count: int = 0) -> ChatSessionOut:
    return ChatSessionOut(
        id=s.id,
        title=s.title,
        created_at=s.created_at,
        updated_at=s.updated_at,
        study_session_id=s.study_session_id,
        message_count=message_count,
    )


@router.post("/sessions", response_model=ChatSessionOut, status_code=201)
async def create_chat_session(
    payload: ChatSessionCreate,
    session: AsyncSession = Depends(get_session),
):
    title = (payload.title or "新对话").strip()[:200] or "新对话"
    obj = ChatSession(title=title, study_session_id=payload.study_session_id)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return _serialize_session(obj, 0)


@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_chat_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(ChatSession).order_by(ChatSession.updated_at.desc()).limit(limit)
    result = await session.execute(stmt)
    sessions = list(result.scalars())
    # 一次性取每条会话的消息数
    out = []
    for s in sessions:
        cnt_q = select(ChatMessage).where(ChatMessage.session_id == s.id)
        cnt = len((await session.execute(cnt_q)).scalars().all())
        out.append(_serialize_session(s, cnt))
    return out


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_chat_session(
    session_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    # 用 selectinload 避免 N+1
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    result = await session.execute(stmt)
    obj = result.scalar_one()
    msgs = [
        ChatMessageOut(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            meta=m.meta,
            created_at=m.created_at,
        )
        for m in obj.messages
    ]
    return ChatSessionDetail(session=_serialize_session(obj, len(msgs)), messages=msgs)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_chat_session(
    session_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await session.delete(obj)
    await session.commit()


@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def update_chat_session(
    session_id: int,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if "title" in payload and payload["title"]:
        obj.title = str(payload["title"]).strip()[:200] or obj.title
    obj.updated_at = _utcnow()
    await session.commit()
    await session.refresh(obj)
    cnt = len((await session.execute(
        select(ChatMessage).where(ChatMessage.session_id == obj.id)
    )).scalars().all())
    return _serialize_session(obj, cnt)


@router.post("/sessions/{session_id}/messages", response_model=PostMessageOut)
async def post_message(
    session_id: int,
    payload: ChatMessageCreate,
    session: AsyncSession = Depends(get_session),
):
    """发消息, AI 自动回复, 两者都存."""
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # 1) 存用户消息
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=payload.content,
        meta=payload.context,
    )
    session.add(user_msg)
    await session.flush()

    # 2) 取历史 (最近 30 条, 不含本次)
    hist_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.id != user_msg.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(30)
    )
    hist = list((await session.execute(hist_stmt)).scalars())
    hist.reverse()
    history = [{"role": m.role, "content": m.content} for m in hist]

    # 3) 拿长期记忆上下文
    concepts = await _recent_concepts_text(session, 15)

    # 4) 调 LLM
    if not is_available():
        raise HTTPException(status_code=503, detail="LLM 未配置, 无法生成回复")
    try:
        reply = await chat_completion(
            history=history,
            user_message=payload.content,
            context=payload.context,
            memory_summary=None,
            recent_concepts=concepts,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # 5) 存 AI 回复
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=reply,
    )
    session.add(ai_msg)

    # 6) 更新会话时间
    obj.updated_at = _utcnow()
    # 自动从用户首条消息生成标题 (如果还是默认)
    if obj.title == "新对话" and history == []:
        obj.title = payload.content[:50] if len(payload.content) > 50 else payload.content

    await session.commit()
    await session.refresh(user_msg)
    await session.refresh(ai_msg)
    return PostMessageOut(
        user=ChatMessageOut(
            id=user_msg.id,
            session_id=user_msg.session_id,
            role=user_msg.role,
            content=user_msg.content,
            meta=user_msg.meta,
            created_at=user_msg.created_at,
        ),
        assistant=ChatMessageOut(
            id=ai_msg.id,
            session_id=ai_msg.session_id,
            role=ai_msg.role,
            content=ai_msg.content,
            meta=ai_msg.meta,
            created_at=ai_msg.created_at,
        ),
    )


@router.post("/sessions/{session_id}/extract-concepts")
async def extract_concepts(
    session_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """从整个会话中提取概念, 返回候选列表 (不自动保存)."""
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if not is_available():
        raise HTTPException(status_code=503, detail="LLM 未配置")

    # 拼 transcript
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    msgs = list((await session.execute(stmt)).scalars())
    transcript = "\n\n".join(
        f"[{m.role}]\n{m.content}" for m in msgs if m.role in ("user", "assistant")
    )
    if not transcript.strip():
        return {"concepts": []}

    try:
        concepts = await extract_concepts_from_transcript(transcript)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"concepts": [c.model_dump() for c in concepts]}



@router.post("/sessions/{session_id}/messages/stream")
async def post_message_stream(
    session_id: int,
    payload: ChatMessageCreate,
    session: AsyncSession = Depends(get_session),
):
    """������Ϣ + AI ��ʽ�ظ� (Server-Sent Events).

    �¼�:
      user:  {"id": ..., "role": "user"}  �û���Ϣ�����
      delta: {"content": "xxx"}           AI ����Ƭ�� (���)
      done:  {"id": ..., "full": "..."}  AI ��Ϣ�����
      error: {"detail": "..."}            ����ʱ
    """
    obj = await session.get(ChatSession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if not is_available():
        raise HTTPException(status_code=503, detail="LLM δ����, �޷����ɻظ�")

    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=payload.content,
        meta=payload.context,
    )
    session.add(user_msg)
    await session.flush()

    hist_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.id != user_msg.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(30)
    )
    hist = list((await session.execute(hist_stmt)).scalars())
    hist.reverse()
    history = [{"role": m.role, "content": m.content} for m in hist]

    concepts = await _recent_concepts_text(session, 15)

    obj.updated_at = _utcnow()
    if obj.title == "�¶Ի�" and not history:
        obj.title = payload.content[:50] if len(payload.content) > 50 else payload.content
    await session.commit()
    await session.refresh(user_msg)

    async def event_gen():
        import json as _json
        yield "event: user\ndata: " + _json.dumps({"id": user_msg.id, "role": "user"}, ensure_ascii=False) + "\n\n"
        buf = []
        try:
            async for piece in chat_completion_stream(
                history=history,
                user_message=payload.content,
                context=payload.context,
                memory_summary=None,
                recent_concepts=concepts,
            ):
                buf.append(piece)
                yield "event: delta\ndata: " + _json.dumps({"content": piece}, ensure_ascii=False) + "\n\n"
        except Exception as e:
            log.exception("stream failed")
            yield "event: error\ndata: " + _json.dumps({"detail": str(e)}, ensure_ascii=False) + "\n\n"
            return

        full = "".join(buf).strip()
        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=full,
        )
        session.add(ai_msg)
        await session.commit()
        await session.refresh(ai_msg)
        yield "event: done\ndata: " + _json.dumps({"id": ai_msg.id, "full": full}, ensure_ascii=False) + "\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
