"""知识卡 + 复习队列 API."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_session
from app.models import QACard, utcnow
from app.schemas import CardCreate, CardOut, CardReviewIn, CardUpdate
from app.services.ebbinghaus import (
    MAX_MASTERY,
    schedule_failed,
    schedule_passed,
)

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.post("", response_model=CardOut, status_code=status.HTTP_201_CREATED)
async def create_card(
    payload: CardCreate,
    session: AsyncSession = Depends(get_session),
):
    obj = QACard(
        question=payload.question,
        answer=payload.answer,
        tag=payload.tag,
        source=payload.source,
        session_id=payload.session_id,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("", response_model=List[CardOut])
async def list_cards(
    tag: Optional[str] = None,
    favorited: Optional[bool] = None,
    mastery: Optional[int] = Query(default=None, ge=0, le=5),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(QACard)
    if tag is not None:
        stmt = stmt.where(QACard.tag == tag)
    if favorited is not None:
        stmt = stmt.where(QACard.favorited.is_(favorited))
    if mastery is not None:
        stmt = stmt.where(QACard.mastery == mastery)
    stmt = stmt.order_by(QACard.created_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars())


@router.get("/review", response_model=List[CardOut])
async def review_queue(session: AsyncSession = Depends(get_session)):
    """返回待复习队列: next_review_at <= now 且 mastery < 5, 按到期时间升序.

    新卡 (next_review_at IS NULL) 视为已到期, 立即可复习.
    """
    now = utcnow()
    stmt = (
        select(QACard)
        .where(QACard.mastery < MAX_MASTERY)
        .where(
            (QACard.next_review_at.is_(None)) | (QACard.next_review_at <= now)
        )
        .order_by(QACard.next_review_at.asc().nulls_first())
    )
    result = await session.execute(stmt)
    return list(result.scalars())


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(
    card_id: int,
    payload: CardUpdate,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(QACard, card_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Card not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.post("/{card_id}/review", response_model=CardOut)
async def review_card(
    card_id: int,
    payload: CardReviewIn,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(QACard, card_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Card not found")
    now = utcnow()
    if payload.passed:
        new_mastery, interval, nxt = schedule_passed(obj.mastery, now)
    else:
        new_mastery, interval, nxt = schedule_failed(obj.mastery, now)
    obj.mastery = new_mastery
    obj.interval_days = interval
    obj.last_reviewed_at = now
    obj.next_review_at = nxt
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(QACard, card_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Card not found")
    await session.delete(obj)
    await session.commit()
