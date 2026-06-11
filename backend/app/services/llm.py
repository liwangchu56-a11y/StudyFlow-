"""LLM 服务: OpenAI 兼容 SDK."""
import json
import logging
from typing import AsyncIterator, List, Optional, Tuple

from openai import AsyncOpenAI

from app.config import get_settings
from app.schemas import ExtractedConcept, QACase

log = logging.getLogger("studyflow.llm")

_client: Optional[AsyncOpenAI] = None


def _get_client() -> Optional[AsyncOpenAI]:
    global _client
    if _client is not None:
        return _client
    cfg = get_settings()
    if not cfg.ai_enabled:
        return None
    _client = AsyncOpenAI(
        api_key=cfg.llm_api_key,
        base_url=cfg.llm_base_url,
        timeout=60.0,
    )
    return _client


def is_available() -> bool:
    return _get_client() is not None


def _model() -> str:
    return get_settings().llm_model


# ============ 旧: 总结 + 问答提炼 ============

SUMMARIZE_PROMPT = """你是学习助手. 阅读用户的学习笔记, 输出一份 JSON 格式的总结.
要求:
1. summary: 一段中文总结, 控制在 100 字以内.
2. key_points: 2-5 条关键知识点, 每条 20 字以内, JSON 数组.
3. suggestions: 2-3 条进一步学习建议, 每条 20 字以内, JSON 数组.
仅输出合法 JSON.

用户笔记:
\"\"\"
{note}
\"\"\"
本次学习时长: {duration_min} 分钟.

输出 JSON:"""

EXTRACT_QA_PROMPT = """你是学习助手. 阅读用户提供的文本, 自动提炼 3-10 张问答卡.
每张卡片包含 question 和 answer 两个字段.
要求:
- 问题简洁明确, 答案精炼 (50 字以内).
- 覆盖文本的核心概念.
- 输出 JSON 数组: [{{"question": "...", "answer": "..."}}, ...]

文本:
\"\"\"
{text}
\"\"\"

输出 JSON:"""


def _extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


async def summarize(note, duration_sec):
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    duration_min = max(1, duration_sec // 60)
    prompt = SUMMARIZE_PROMPT.format(note=note[:6000], duration_min=duration_min)
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
    except Exception as e:
        log.exception("summarize failed")
        raise RuntimeError("LLM 调用失败: " + str(e))
    content = (resp.choices[0].message.content or "").strip()
    data = _extract_json(content)
    return {
        "summary": str(data.get("summary", "")).strip(),
        "key_points": [str(x).strip() for x in data.get("key_points", [])][:5],
        "suggestions": [str(x).strip() for x in data.get("suggestions", [])][:3],
    }


async def extract_qa(text):
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    prompt = EXTRACT_QA_PROMPT.format(text=text[:6000])
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
    except Exception as e:
        log.exception("extract_qa failed")
        raise RuntimeError("LLM 调用失败: " + str(e))
    content = (resp.choices[0].message.content or "").strip()
    data = _extract_json(content)
    raw = data.get("cards", [])
    if raw is None:
        raw = []
    if isinstance(data, list):
        raw = data
    out = []
    for item in raw[:20]:
        q = str(item.get("question", "")).strip()
        a = str(item.get("answer", "")).strip()
        if q and a:
            out.append(QACase(question=q, answer=a))
    return out


# ============ 新: 聊天 ============

# 系统提示: 学习陪伴 + 老师双模式
CHAT_SYSTEM_PROMPT = """你是 StudyFlow 的学习伙伴, 同时扮演两个角色, 根据用户当前状态自动切换:

【1. 学习陪伴】(默认姿态)
   当用户说"我今天学了 X", "刚完成一个番茄钟", "有点累/卡住了/没状态", 或者只是想聊聊感受时, 你是他身边那个安静又温暖的学习同伴:
   - 先接住对方的情绪: "辛苦了", "嗯 那种感觉我懂", "没事, 慢慢来"
   - 像朋友一样陪聊, 不是老师那样立刻指出问题
   - 鼓励为主, 不评判不催促, 永远不让人觉得"我又没做好"
   - 在合适的时候轻轻带一句: "你刚才说的那个 X, 我挺好奇你是怎么理解的?" 让他自己说出来
   - 用户说想休息/摸鱼/吐槽, 就接着聊, 不要强行拉回学习
   - 用户明显没动力时, 用一句具体的、小的、马上能做的小事代替大目标: "要不先就做 5 分钟, 5 分钟就停"

【2. 学科老师】(用户主动问概念/技术时切换)
   当用户问"什么是 X", "怎么用 Y", "为什么 Z" 这类具体问题时, 切换为清晰的老师模式:
   - 先用一两句话给个直觉, 再展开
   - 用一个具体类比或小例子辅助理解
   - 必要时给最小可运行代码 (用 ``` 包裹, 注明语言)
   - 讲完留个小小的反问或小练习, 让他消化, 不要直接列 5 条 bullet

【风格总则】
- 永远中文, 永远自然, 永远不要带"作为一个 AI 助手"这种开场白
- 不要堆 emoji, 不要堆 bullet point
- 一次只说一件事, 短句优先
- 用户没问就不主动给"学习建议清单"或"今日计划"
- 不用感叹号, 不用煽情鸡汤, 不用"加油!你一定可以!"

【关于记忆】
你会在 system 消息里看到用户最近学过的知识点列表. 当他聊到相关话题时, 自然地提一下"你之前学过 X, 这次 Y 跟它是一类东西" 即可, 不要逐条罗列.

你现在不是 AI, 你是这个用户身边最熟悉他学习节奏的那个人. 像朋友一样说话, 像老师一样专业."""


def _build_chat_messages(
    history: List[dict],
    user_message: str,
    context: Optional[str] = None,
    memory_summary: Optional[str] = None,
    recent_concepts: Optional[List[str]] = None,
) -> List[dict]:
    """构造发给 LLM 的 messages 列表."""
    msgs: List[dict] = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    # 注入长期记忆摘要 (如果有)
    memory_block = ""
    if memory_summary:
        memory_block += f"\n\n[长期记忆摘要]\n{memory_summary}"
    if recent_concepts:
        concepts_text = "\n".join(f"- {c}" for c in recent_concepts[:20])
        memory_block += f"\n\n[最近学过的知识点]\n{concepts_text}"
    if memory_block:
        msgs.append({"role": "system", "content": memory_block.strip()})

    # 注入当前上下文 (例如番茄钟刚结束)
    if context:
        msgs.append({"role": "system", "content": f"[系统事件]\n{context}"})

    # 历史消息
    for h in history:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            msgs.append({"role": h["role"], "content": h["content"]})

    # 当前用户消息
    msgs.append({"role": "user", "content": user_message})
    return msgs


async def chat_completion(
    history: List[dict],
    user_message: str,
    context: Optional[str] = None,
    memory_summary: Optional[str] = None,
    recent_concepts: Optional[List[str]] = None,
    temperature: float = 0.7,
) -> str:
    """非流式聊天, 返回完整 AI 响应."""
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    msgs = _build_chat_messages(history, user_message, context, memory_summary, recent_concepts)
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=msgs,
            temperature=temperature,
        )
    except Exception as e:
        log.exception("chat_completion failed")
        raise RuntimeError("LLM 调用失败: " + str(e))
    return (resp.choices[0].message.content or "").strip()


async def chat_completion_stream(
    history: List[dict],
    user_message: str,
    context: Optional[str] = None,
    memory_summary: Optional[str] = None,
    recent_concepts: Optional[List[str]] = None,
    temperature: float = 0.7,
) -> AsyncIterator[str]:
    """流式聊天, yield 增量内容片段."""
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    msgs = _build_chat_messages(history, user_message, context, memory_summary, recent_concepts)
    try:
        stream = await client.chat.completions.create(
            model=_model(),
            messages=msgs,
            temperature=temperature,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
    except Exception as e:
        log.exception("chat_completion_stream failed")
        raise RuntimeError("LLM 调用失败: " + str(e))


# ============ 新: 概念提取 ============

EXTRACT_CONCEPTS_PROMPT = """你是学习助手. 阅读以下用户与 AI 的对话, 提取用户学到的**具体知识点**.

要求:
1. 概念必须是用户**新学到**的 (不是 AI 已知的常识)
2. 每个概念包含: name (简洁, 不超过 20 字), description (用户学到的内容, 50 字以内), category (可选分类如 Python/算法/数学)
3. 忽略闲聊和与学习无关的内容
4. 如果对话中没学到新东西, 返回空数组
5. 输出 JSON: {{"concepts": [{{"name": "...", "description": "...", "category": "..."}}, ...]}}

对话:
\"\"\"
{transcript}
\"\"\"

输出 JSON:"""


async def extract_concepts_from_transcript(transcript: str) -> List[ExtractedConcept]:
    """从一段对话中提取概念列表."""
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    prompt = EXTRACT_CONCEPTS_PROMPT.format(transcript=transcript[:8000])
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
    except Exception as e:
        log.exception("extract_concepts failed")
        raise RuntimeError("LLM 调用失败: " + str(e))
    content = (resp.choices[0].message.content or "").strip()
    try:
        data = _extract_json(content)
    except Exception:
        return []
    raw = data.get("concepts", [])
    out: List[ExtractedConcept] = []
    for item in raw[:30]:
        name = str(item.get("name", "")).strip()
        desc = str(item.get("description", "")).strip()
        if not name or not desc:
            continue
        cat = item.get("category")
        out.append(ExtractedConcept(
            name=name[:120],
            description=desc[:500],
            category=str(cat).strip()[:64] if cat else None,
        ))
    return out


# ============ 新: 重新聚类 ============

REORGANIZE_PROMPT = """你是知识管理助手. 我会给你一份用户学过的所有概念列表, 请重新聚类整理.

任务:
1. **duplicates**: 找出明显重复/同义的概念, 列出每组重复的 id (用 [id1, id2] 格式, 多个数组表示多组)
2. **groups**: 把所有概念分成 3-7 个主题分组, 每组给一个 group 名 (简短中文) 和简短的 description, 列出该组包含的 concept id
3. **suggested_renames**: 哪些概念名应该改得更清晰? 给出 id 和 new_name

输出严格 JSON 格式:
{{
  "duplicates": [[1, 5], [8, 12]],
  "groups": [
    {{"group": "Python 基础", "description": "Python 语法和基础概念", "concept_ids": [1, 2, 5]}},
    ...
  ],
  "suggested_renames": [
    {{"id": 3, "new_name": "Python 装饰器 (Decorator)", "reason": "更准确"}}
  ]
}}

概念列表 (id | name | category | description):
{concepts_text}

输出 JSON:"""


async def reorganize_concepts(concepts: List[dict]) -> dict:
    """AI 重新聚类 + 找重复 + 建议改名."""
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM 未配置")
    lines = []
    for c in concepts:
        cat = c.get("category") or "-"
        lines.append(f"{c['id']} | {c['name']} | {cat} | {c['description']}")
    concepts_text = "\n".join(lines)
    prompt = REORGANIZE_PROMPT.format(concepts_text=concepts_text[:10000])
    try:
        resp = await client.chat.completions.create(
            model=_model(),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
    except Exception as e:
        log.exception("reorganize failed")
        raise RuntimeError("LLM 调用失败: " + str(e))
    content = (resp.choices[0].message.content or "").strip()
    try:
        return _extract_json(content)
    except Exception:
        return {"duplicates": [], "groups": [], "suggested_renames": []}