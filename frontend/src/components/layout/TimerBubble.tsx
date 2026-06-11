import { useEffect, useState } from "react";
import { useTimerStore, phaseTotalSec } from "../../store/timerStore";
import { useSettings } from "../../api/settings";
import { useTimer } from "../../hooks/useTimer";
import { useUiStore } from "../../store/uiStore";
import { formatClock } from "../../lib/format";

type P = "idle" | "focus" | "shortBreak" | "longBreak" | "finished";
type M = "pomodoro" | "free";

const STYLES: Record<P, { ring: string; glow: string; track: string; label: string; emoji: string }> = {
  idle:       { ring: "#94a3b8", glow: "rgba(148,163,184,0.18)", track: "rgba(148,163,184,0.18)", label: "待机",     emoji: "⏱️" },
  focus:      { ring: "#8b5cf6", glow: "rgba(139,92,246,0.32)",  track: "rgba(139,92,246,0.15)",  label: "专注中",   emoji: "🍅" },
  shortBreak: { ring: "#10b981", glow: "rgba(16,185,129,0.32)",  track: "rgba(16,185,129,0.15)",  label: "短休息",   emoji: "☕" },
  longBreak:  { ring: "#0ea5e9", glow: "rgba(14,165,233,0.32)",  track: "rgba(14,165,233,0.15)",  label: "长休息",   emoji: "🌊" },
  finished:   { ring: "#94a3b8", glow: "rgba(148,163,184,0.18)", track: "rgba(148,163,184,0.18)", label: "已完成",   emoji: "✨" },
};

const S = 96;
const STROKE = 7;
const R = (S - STROKE) / 2;
const C = 2 * Math.PI * R;

function PhaseEmoji({ phase }: { phase: P }) {
  if (phase === "focus") return <span className="text-[18px]">{"🍅"}</span>;
  if (phase === "shortBreak") return <span className="text-[18px]">{"☕"}</span>;
  if (phase === "longBreak") return <span className="text-[18px]">{"🌊"}</span>;
  if (phase === "finished") return <span className="text-[18px]">{"✨"}</span>;
  return <span className="text-[18px]">{"⏱️"}</span>;
}

export function TimerBubble() {
  const p = useTimerStore((s) => s.phase) as P;
  const st = useTimerStore((s) => s.status);
  const rem = useTimerStore((s) => s.remainingSec);
  const mo = useTimerStore((s) => s.mode);
  const fc = useTimerStore((s) => s.focusCount);
  const focusMin = useTimerStore((s) => s.focusMin);
  const sf = useTimerStore((s) => s.startFree);
  const sp = useTimerStore((s) => s.startPomodoro);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const stop = useTimerStore((s) => s.stop);
  const sc = useTimerStore((s) => s.setConfig);
  const { data: cfg } = useSettings();
  const om = useUiStore((s) => s.openModal);
  const [ex, setEx] = useState(false);
  // 临时未启动选中的模式, 与 store.mode 解耦
  const [localMode, setLocalMode] = useState<M>("free");
  // 点击模式按钮 -> 走动画: 滑块已定位 -> 面板收起 -> 圆环 sweep -> 启动
  const [starting, setStarting] = useState(false);
  // 圆环 sweep 阶段 (sweep 期间显示, sweep 完成后切到进度环)
  const [sweeping, setSweeping] = useState(false);
  // 面板 / 启动 收尾
  const [stopping, setStopping] = useState(false);

  useTimer();
  useEffect(() => {
    if (cfg) {
      sc({
        focusMin: cfg.focus_min,
        shortBreakMin: cfg.short_break_min,
        longBreakMin: cfg.long_break_min,
        longBreakInterval: cfg.long_break_interval,
      });
    }
  }, [cfg, sc]);

  // 打开面板时, 同步 localMode 为当前 store mode
  useEffect(() => {
    if (ex && !starting && !stopping) setLocalMode(mo);
  }, [ex, mo, starting, stopping]);

  const meta = STYLES[p];
  const total = phaseTotalSec(useTimerStore.getState()) || 1;
  const ratio = total > 0 ? Math.max(0, Math.min(1, rem / total)) : 0;
  const run = st === "running";
  const idle = p === "idle" || p === "finished";
  const isFreeRunning = mo === "free" && !idle;
  const idleMinutes = cfg?.focus_min ?? focusMin ?? 25;

  // 点击「开始」按钮 -> 走完整启动序列 (滑块定位 + 面板淡出 + 圆环 sweep + 启动)
  const handleStart = (mode: M) => {
    if (starting || stopping) return;
    setLocalMode(mode);
    setStarting(true);
    setTimeout(() => {
      setEx(false);
      setSweeping(true);
      if (mode === "pomodoro") sp();
      else sf();
      setTimeout(() => {
        setSweeping(false);
        setStarting(false);
      }, 800);
    }, 320);
  };

  // 点击结束 -> 圆环 unwind 动画 (500ms) + 面板淡出 -> 停止
  const [stopSummaryShown, setStopSummaryShown] = useState(false);
  const handleStop = () => {
    if (starting || stopping) return;
    setStopping(true);
    setTimeout(() => {
      if (mo === "pomodoro" && fc > 0 && !stopSummaryShown) {
        om("summary", { mode: "pomodoro", durationSec: (cfg?.focus_min ?? 25) * 60 * fc, focusCount: fc });
        setStopSummaryShown(true);
      }
      stop();
      setEx(false);
      setTimeout(() => setStopping(false), 350);
    }, 550);
  };

  return (
    <div className="relative">
      {/* 外层阵发光 · 跟随阶段变色 */}
      <div
        className="absolute -inset-2 rounded-3xl blur-2xl opacity-60 pointer-events-none transition-colors duration-700"
        style={{ background: meta.glow }}
        aria-hidden
      />

      <button
        onClick={() => setEx((o) => !o)}
        className={[
          "group relative flex items-center gap-3 rounded-2xl",
          "bg-white/90 backdrop-blur-xl border border-white/60",
          "pl-2 pr-3 py-2 min-w-[260px]",
          "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)]",
          "hover:shadow-[0_8px_28px_-6px_rgba(139,92,246,0.28)]",
          "hover:scale-[1.02] active:scale-[0.99]",
          "transition-all duration-300",
          run ? "ring-1 ring-violet-200/70" : "",
          starting ? "scale-105" : "",
        ].join(" ")}
      >
        {/* 圈 + emoji · 96px */}
        <div className="relative flex-shrink-0" style={{ width: S, height: S }}>
          <div
            className="absolute inset-0 rounded-full opacity-50"
            style={{ background: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)` }}
            aria-hidden
          />
          <svg width={S} height={S} className="relative transform -rotate-90">
            {/* track */}
            <circle
              cx={S / 2} cy={S / 2} r={R}
              stroke={meta.track} strokeWidth={STROKE} fill="none"
            />
            {/* 启动瞬间的 sweep 圈: 从 12 点顺时针填满一圈 */}
            {sweeping && (
              <circle
                key={"sweep-" + Date.now()}
                cx={S / 2} cy={S / 2} r={R}
                stroke={meta.ring} strokeWidth={STROKE} fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                className="ring-sweep"
              />
            )}
            {/* 正常运行时的进度圈 */}
            {!idle && !sweeping && (
              <circle
                cx={S / 2} cy={S / 2} r={R}
                stroke={meta.ring} strokeWidth={STROKE} fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ratio)}
                style={{ transition: "stroke-dashoffset 0.95s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            )}
            {stopping && (
              <circle
                key={"unwind-" + Date.now()}
                cx={S / 2} cy={S / 2} r={R}
                stroke={meta.ring} strokeWidth={STROKE} fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                className="ring-unwind"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <PhaseEmoji phase={p} />
            <span className="text-[10px] mt-0.5 font-semibold text-slate-500 tracking-wider">
              {idle ? "待机" : meta.label}
            </span>
            {run && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
        </div>

        {/* 右侧主信息 */}
        <div className="flex flex-col items-start leading-tight min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {mo === "pomodoro" ? "POMODORO" : "FREE"}
            </span>
            {mo === "pomodoro" && fc > 0 && (
              <span className="text-[10px] text-violet-600 font-semibold">
                {"·"} {fc}枚
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[22px] font-mono font-bold text-slate-800 tabular-nums tracking-tight">
              {idle ? `${String(idleMinutes).padStart(2, "0")}:00` : formatClock(rem)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {isFreeRunning
              ? "自由计时中"
              : idle
                ? (mo === "pomodoro" ? "点击选择模式" : "准备开始")
                : run
                  ? "进行中 · 可暂停"
                  : "已暂停 · 可继续"}
          </span>
        </div>
      </button>

      {/* 展开后的控制面板 */}
      {ex && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={[
            "absolute top-full left-0 mt-2 z-30 w-[260px] rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-2xl p-3",
            starting || stopping
              ? "animate-out fade-out slide-out-to-top-2 duration-200"
              : "animate-in fade-in slide-in-from-top-1 duration-200",
          ].join(" ")}
        >
          {idle ? (
            <>
              <div className="relative grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/80">
                <div
                  className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out"
                  style={{
                    left: localMode === "pomodoro" ? "4px" : "calc(50% + 2px)",
                    right: localMode === "pomodoro" ? "calc(50% + 2px)" : "4px",
                  }}
                  aria-hidden
                />
                <button
                  onClick={() => handleStart("pomodoro")}
                  disabled={starting}
                  className={[
                    "relative rounded-lg py-3 text-[13px] font-semibold transition-colors z-10",
                    localMode === "pomodoro" ? "text-violet-600" : "text-slate-500 hover:text-slate-700",
                    starting ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {"🍅"} 番茄
                </button>
                <button
                  onClick={() => setLocalMode("free")}
                  disabled={starting}
                  className={[
                    "relative rounded-lg py-3 text-[13px] font-semibold transition-colors z-10",
                    localMode === "free" ? "text-violet-600" : "text-slate-500 hover:text-slate-700",
                    starting ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {"⏱️"} 自由
                </button>
              </div>
              <button
                onClick={() => handleStart("free")}
                disabled={starting}
                className={[
                  "w-full rounded-xl py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.5)] transition-all mt-2.5",
                  "bg-gradient-to-br from-violet-500 to-indigo-500",
                  starting ? "scale-95 opacity-80" : "hover:scale-[1.02] active:scale-[0.98]",
                ].join(" ")}
              >
                {starting ? "启动中 ..." : "开始 · 自由计时"}
              </button>

            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => (run ? pause() : resume())}
                  className={[
                    "flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]",
                    run
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.5)]",
                  ].join(" ")}
                >
                  {run ? "⏸ 暂停" : "▶ 继续"}
                </button>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className={[
                    "rounded-xl px-4 py-2.5 text-[13px] font-semibold bg-slate-100 text-slate-700 transition-all",
                    "hover:bg-rose-100 hover:text-rose-600",
                    stopping ? "opacity-50" : "active:scale-[0.98]",
                  ].join(" ")}
                  title="结束"
                >
                  {"⏹"}
                </button>
              </div>
              {mo === "pomodoro" && (
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>已完成 {fc} 枚专注</span>
                  <span>本轮 {cfg?.long_break_interval ?? 4} 枚后进入长休息</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
