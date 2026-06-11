"""知识点 (长期记忆) API."""
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_session
from app.models import ChatSession, LearnedConcept
from app.schemas import (
    ConceptCreate,
    ConceptGroup,
    ConceptOut,
    ConceptUpdate,
    RenameSuggestion,
    ReorganizeOut,
)
from app.services.llm import is_available, reorganize_concepts

log = logging.getLogger("studyflow.concepts")
router = APIRouter(prefix="/api/concepts", tags=["concepts"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=List[ConceptOut])
async def list_concepts(
    status: Optional[str] = Query(default=None, pattern="^(active|archived)$"),
    concept_group: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(LearnedConcept)
    if status:
        stmt = stmt.where(LearnedConcept.status == status)
    if concept_group:
        stmt = stmt.where(LearnedConcept.concept_group == concept_group)
    if category:
        stmt = stmt.where(LearnedConcept.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (LearnedConcept.name.ilike(like)) | (LearnedConcept.description.ilike(like))
        )
    stmt = stmt.order_by(LearnedConcept.created_at.desc()).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars())


@router.get("/groups", response_model=List[str])
async def list_groups(session: AsyncSession = Depends(get_session)):
    """返回所有不重复的 concept_group."""
    stmt = (
        select(LearnedConcept.concept_group)
        .where(LearnedConcept.status == "active", LearnedConcept.concept_group.isnot(None))
        .distinct()
    )
    result = await session.execute(stmt)
    return [r[0] for r in result.all() if r[0]]


@router.post("", response_model=ConceptOut, status_code=201)
async def create_concept(
    payload: ConceptCreate,
    session: AsyncSession = Depends(get_session),
):
    obj = LearnedConcept(
        name=payload.name.strip()[:120],
        description=payload.description.strip(),
        category=payload.category.strip()[:64] if payload.category else None,
        concept_group=payload.concept_group.strip()[:64] if payload.concept_group else None,
        source_session_id=payload.source_session_id,
        source_message_ids=json.dumps(payload.source_message_ids) if payload.source_message_ids else None,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.post("/bulk", response_model=List[ConceptOut], status_code=201)
async def bulk_create_concepts(
    items: List[ConceptCreate],
    session: AsyncSession = Depends(get_session),
):
    """批量保存 (来自 AI 提取)."""
    out = []
    for payload in items:
        obj = LearnedConcept(
            name=payload.name.strip()[:120],
            description=payload.description.strip(),
            category=payload.category.strip()[:64] if payload.category else None,
            concept_group=payload.concept_group.strip()[:64] if payload.concept_group else None,
            source_session_id=payload.source_session_id,
            source_message_ids=json.dumps(payload.source_message_ids) if payload.source_message_ids else None,
        )
        session.add(obj)
        out.append(obj)
    await session.commit()
    for o in out:
        await session.refresh(o)
    return out


@router.patch("/{concept_id}", response_model=ConceptOut)
async def update_concept(
    concept_id: int,
    payload: ConceptUpdate,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(LearnedConcept, concept_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Concept not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = _utcnow()
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{concept_id}", status_code=204)
async def delete_concept(
    concept_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(LearnedConcept, concept_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Concept not found")
    await session.delete(obj)
    await session.commit()


@router.post("/reorganize", response_model=ReorganizeOut)
async def reorganize(session: AsyncSession = Depends(get_session)):
    """AI 重新聚类所有 active 概念 + 找重复 + 建议改名.

    注意: 这只返回建议, 不会自动应用. 前端可以让用户预览确认后再批量更新.
    """
    if not is_available():
        raise HTTPException(status_code=503, detail="LLM 未配置")
    stmt = (
        select(LearnedConcept)
        .where(LearnedConcept.status == "active")
        .order_by(LearnedConcept.created_at)
    )
    concepts = list((await session.execute(stmt)).scalars())
    if len(concepts) == 0:
        return ReorganizeOut(groups=[], suggested_renames=[], duplicates=[])
    payload = [
        {
            "id": c.id,
            "name": c.name,
            "category": c.category,
            "description": c.description,
        }
        for c in concepts
    ]
    try:
        result = await reorganize_concepts(payload)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    groups = [
        ConceptGroup(
            group=g.get("group", ""),
            description=g.get("description"),
            concept_ids=list(g.get("concept_ids", [])),
        )
        for g in result.get("groups", [])
    ]
    renames = [
        RenameSuggestion(id=r["id"], new_name=r["new_name"], reason=r.get("reason"))
        for r in result.get("suggested_renames", [])
        if "id" in r and "new_name" in r
    ]
    duplicates = [
        d for d in result.get("duplicates", []) if isinstance(d, list) and all(isinstance(x, int) for x in d)
    ]
    return ReorganizeOut(groups=groups, suggested_renames=renames, duplicates=duplicates)


@router.post("/apply-reorganize")
async def apply_reorganize(
    payload: ReorganizeOut,
    session: AsyncSession = Depends(get_session),
):
    """应用 reorganize 结果: 更新 group 字段 + 改名 + 合并重复 (标记 archived)."""
    affected = 0
    # 1) 应用改名
    for r in payload.suggested_renames:
        obj = await session.get(LearnedConcept, r.id)
        if obj:
            obj.name = r.new_name[:120]
            obj.updated_at = _utcnow()
            affected += 1
    # 2) 应用 group
    for g in payload.groups:
        for cid in g.concept_ids:
            obj = await session.get(LearnedConcept, cid)
            if obj:
                obj.concept_group = g.group[:64]
                obj.updated_at = _utcnow()
                affected += 1
    # 3) 处理重复: 每组保留第一个, 其它 archive
    for d in payload.duplicates:
        if len(d) < 2:
            continue
        keep_id = d[0]
        for cid in d[1:]:
            obj = await session.get(LearnedConcept, cid)
            if obj and obj.status == "active":
                obj.status = "archived"
                obj.updated_at = _utcnow()
                affected += 1
    await session.commit()
    return {"affected": affected}