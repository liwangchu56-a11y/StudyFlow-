import { useState } from "react";
import type { QACard } from "../../types/api";

export function FlipCard({ card, onAnswer }: { card: QACard; onAnswer?: (passed: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="perspective-1000 w-full h-56 cursor-pointer select-none"
      onClick={() => setFlipped((f) => !f)}
      role="button"
      aria-pressed={flipped}
      aria-label={card.question}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "none",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* 正面: 问题 */}
        <div
          className="absolute inset-0 rounded-2xl bg-white border border-slate-200/60 p-5 flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04)",
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span className="text-violet-600">L{card.mastery}</span>
              {card.favorited && <span className="text-amber-500">★</span>}
            </div>
            {card.tag && (
              <span className="text-slate-400">#{card.tag}</span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center text-center px-1">
            <p className="text-slate-900 font-medium leading-relaxed tracking-tight">
              {card.question}
            </p>
          </div>
          <div className="text-[11px] text-slate-400 text-center tracking-wider">
            点击翻转
          </div>
        </div>
        {/* 背面: 答案 */}
        <div
          className="absolute inset-0 rounded-2xl text-white p-5 flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 24px rgba(139,92,246,0.4)",
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/80">
            Answer
          </div>
          <div className="flex-1 flex items-center justify-center text-center px-1">
            <p className="leading-relaxed">{card.answer}</p>
          </div>
          {onAnswer && (
            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onAnswer(false)}
                className="flex-1 py-1.5 rounded-full bg-white/15 text-xs hover:bg-white/25 transition"
              >
                不记得
              </button>
              <button
                onClick={() => onAnswer(true)}
                className="flex-1 py-1.5 rounded-full bg-white text-violet-600 text-xs font-medium hover:bg-white/95 transition"
              >
                记得
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}