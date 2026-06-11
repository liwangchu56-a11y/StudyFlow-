"""学习会话 API."""
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_session
from app.models import QACard, StudySession
from app.schemas import SessionCreate, SessionOut, SessionPatch

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    session: AsyncSession = Depends(get_session),
):
    """创建学习会话. 可选附带 auto_qa 自动生成问答卡."""
    obj = StudySession(
        mode=payload.mode,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        duration_sec=payload.duration_sec,
        focus_count=payload.focus_count,
        note=payload.note,
        summary=payload.summary,
        summary_structured=(
            json.dumps(payload.summary_structured, ensure_ascii=False)
            if payload.summary_structured
            else None
        ),
    )
    session.add(obj)
    await session.flush()  # 取到 id

    for qa in payload.auto_qa:
        card = QACard(
            question=qa.question,
            answer=qa.answer,
            tag=qa.tag,
            source="ai" if payload.summary else "manual",
            session_id=obj.id,
        )
        session.add(card)

    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("", response_model=List[SessionOut])
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(StudySession).order_by(StudySession.started_at.desc()).limit(limit)
    )
    return list(result.scalars())


@router.get("/{session_id}", response_model=SessionOut)
async def get_session_by_id(
    session_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(StudySession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return obj


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: int,
    payload: SessionPatch,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(StudySession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if payload.note is not None:
        obj.note = payload.note
    if payload.summary is not None:
        obj.summary = payload.summary
    if payload.summary_structured is not None:
        obj.summary_structured = json.dumps(
            payload.summary_structured, ensure_ascii=False
        )
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(StudySession, session_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await session.delete(obj)
    await session.commit()
