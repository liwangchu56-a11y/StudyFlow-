import { useUiStore } from "../../store/uiStore";

const options = [
  { kind: "meditation", icon: "🧘", label: "冥想引导", desc: "2 分钟呼吸" },
  { kind: "stretch", icon: "🤸", label: "拉伸运动", desc: "颈肩腰腿" },
  { kind: "eye", icon: "👁", label: "眼保健操", desc: "缓解视疲劳" },
  { kind: "water", icon: "💧", label: "喝水休息", desc: "起身倒杯水" },
  { kind: "skip", icon: "⏭", label: "跳过继续", desc: "直接开始下一段" },
] as const;

export function BreakModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);

  if (modal !== "break") return null;

  const handle = (kind: string) => {
    if (kind === "skip" || kind === "water") {
      closeModal();
    } else {
      openModal("break", { guide: kind });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden
      />
      <div className="relative card-elevated w-full max-w-md p-7 animate-slide-up-spring">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-violet flex items-center justify-center shadow-glow-violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              专注完成
            </h3>
            <p className="text-xs text-slate-500">选一个活动放松一下</p>
          </div>
        </div>

        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.kind}
              onClick={() => handle(o.kind)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200/60 hover:border-violet-300 hover:bg-violet-50/30 transition text-left group"
            >
              <span className="text-2xl">{o.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{o.label}</div>
                <div className="text-xs text-slate-500">{o.desc}</div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}