"""?? API."""
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_session
from app.models import Todo, utcnow
from app.schemas import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.post("", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
async def create_todo(
    payload: TodoCreate,
    session: AsyncSession = Depends(get_session),
):
    obj = Todo(
        title=payload.title,
        priority=payload.priority,
        due_at=payload.due_at,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.get("", response_model=List[TodoOut])
async def list_todos(
    status_filter: Optional[Literal["all", "pending", "completed"]] = Query(
        default="all", alias="status"
    ),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Todo)
    if status_filter == "pending":
        stmt = stmt.where(Todo.completed.is_(False))
    elif status_filter == "completed":
        stmt = stmt.where(Todo.completed.is_(True))
    stmt = stmt.order_by(
        Todo.completed.asc(),
        Todo.priority.asc(),
        Todo.created_at.desc(),
    )
    result = await session.execute(stmt)
    return list(result.scalars())


@router.patch("/{todo_id}", response_model=TodoOut)
async def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(Todo, todo_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    data = payload.model_dump(exclude_unset=True)
    if "completed" in data:
        if data["completed"] and not obj.completed:
            obj.completed_at = utcnow()
        elif not data["completed"] and obj.completed:
            obj.completed_at = None
    for k, v in data.items():
        setattr(obj, k, v)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: int,
    session: AsyncSession = Depends(get_session),
):
    obj = await session.get(Todo, todo_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    await session.delete(obj)
    await session.commit()
