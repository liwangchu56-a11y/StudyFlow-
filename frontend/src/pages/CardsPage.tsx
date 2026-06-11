import { useMemo, useState } from "react";
import { useCards, useDeleteCard, useReviewCard, useUpdateCard } from "../api/cards";
import { useUiStore } from "../store/uiStore";
import { FlipCard } from "../components/cards/FlipCard";
import { formatDate } from "../lib/format";

export function CardsPage() {
  const { data: cards = [] } = useCards();
  const deleteCard = useDeleteCard();
  const reviewCard = useReviewCard();
  const updateCard = useUpdateCard();
  const openModal = useUiStore((s) => s.openModal);
  const showToast = useUiStore((s) => s.showToast);
  const [tab, setTab] = useState<"all" | "review" | "fav">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [q, setQ] = useState("");

  const allTags = useMemo(
    () => Array.from(new Set(cards.map((c) => c.tag).filter(Boolean) as string[])),
    [cards],
  );

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (tab === "fav" && !c.favorited) return false;
      if (tab === "review" && c.mastery >= 5) return false;
      if (tagFilter && c.tag !== tagFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!c.question.toLowerCase().includes(needle) && !c.answer.toLowerCase().includes(needle))
          return false;
      }
      return true;
    });
  }, [cards, tab, tagFilter, q]);

  const handleAnswer = async (cardId: number, passed: boolean) => {
    await reviewCard.mutateAsync({ id: cardId, passed });
    showToast(passed ? "记得 +1" : "再复习");
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="space-y-2">
          <div className="text-eyebrow">KNOWLEDGE CARDS</div>
          <h1 className="text-display text-[clamp(2rem,4vw,3.25rem)] text-slate-900">
            把学到的, <span className="italic font-serif text-violet-600">记住</span>.
          </h1>
          <p className="text-sm text-slate-500">
            艾宾浩斯复习, 1/3/7/15/30/60 天递进间隔
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal("importText")} className="btn-ghost">
            粘贴导入
          </button>
          <button onClick={() => openModal("cardEditor")} className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建
          </button>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-2">
        {([
          ["all", `全部 · ${cards.length}`],
          ["review", "待复习"],
          ["fav", "收藏"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
              tab === k
                ? "bg-slate-900 text-white"
                : "bg-white/60 border border-slate-200/80 text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="h-5 w-px bg-slate-200 mx-1" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索问题或答案"
          className="px-3 py-1.5 rounded-full text-sm bg-white/60 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition w-48"
        />
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm bg-white/60 border border-slate-200/80 focus:outline-none"
          >
            <option value="">全部标签</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        )}
      </section>

      {filtered.length === 0 ? (
        <EmptyCards
          hasAny={cards.length > 0}
          onCreate={() => openModal("cardEditor")}
          onImport={() => openModal("importText")}
        />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((c) => (
            <div key={c.id} className="space-y-3 animate-fade-in-up">
              <FlipCard card={c} onAnswer={(p) => handleAnswer(c.id, p)} />
              <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                <span className="tabular-nums">
                  {c.next_review_at ? `下次 · ${formatDate(c.next_review_at)}` : "新卡"}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateCard.mutate({ id: c.id, favorited: !c.favorited })}
                    className={c.favorited ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}
                    title="收藏"
                  >
                    {c.favorited ? "★" : "☆"}
                  </button>
                  <button
                    onClick={() => openModal("cardEditor", { card: c })}
                    className="text-slate-300 hover:text-slate-700"
                    title="编辑"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteCard.mutate(c.id)}
                    className="text-slate-300 hover:text-red-500"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function EmptyCards({
  hasAny,
  onCreate,
  onImport,
}: {
  hasAny: boolean;
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <div className="card-elevated p-10 sm:p-14 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-violet mx-auto flex items-center justify-center mb-5 shadow-glow-violet">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="14" height="14" rx="2.5" />
          <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H19.5A1.5 1.5 0 0 1 21 4.5v12" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
        {hasAny ? "没有匹配的卡片" : "还没有卡片"}
      </h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
        {hasAny
          ? "试试调整筛选条件, 或新建一张卡片"
          : "手动新建一张, 或粘贴一段文本让 AI 提炼"}
      </p>
      {!hasAny && (
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onCreate} className="btn-primary">
            新建卡片
          </button>
          <button onClick={onImport} className="btn-ghost">
            AI 提炼
          </button>
        </div>
      )}
    </div>
  );
}