"""学后总结 AI API."""
from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_session
from app.schemas import ExtractQAIn, ExtractQAOut, SummarizeIn, SummarizeOut
from app.services.llm import is_available, summarize, extract_qa

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/summarize", response_model=SummarizeOut)
async def ai_summarize(payload: SummarizeIn):
    if not is_available():
        raise HTTPException(status_code=503, detail="LLM 未配置或不可用")
    try:
        return await summarize(payload.note, payload.duration_sec)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/extract-qa", response_model=ExtractQAOut)
async def ai_extract_qa(payload: ExtractQAIn):
    if not is_available():
        raise HTTPException(status_code=503, detail="LLM 未配置或不可用")
    try:
        cards = await extract_qa(payload.text)
        return ExtractQAOut(cards=cards)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
