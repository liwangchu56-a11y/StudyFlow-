import { useEffect, useRef, useState } from "react";
import { useTimerStore, phaseTotalSec } from "../store/timerStore";
import { useSettings, useUpdateSettings } from "../api/settings";
import { useStats } from "../api/stats";
import { useUiStore } from "../store/uiStore";
import { useTimer } from "../hooks/useTimer";
import { useBrowserNotify } from "../hooks/useBrowserNotify";
import { TimerRing } from "../components/timer/TimerRing";
import { TimerControls } from "../components/timer/TimerControls";
import { formatDuration } from "../lib/format";

const PHASE_LABEL: Record<string, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
  finished: "Done",
  idle: "Idle",
};
const PHASE_LABEL_CN: Record<string, string> = {
  focus: "专注中",
  shortBreak: "短休息",
  longBreak: "长休息",
  finished: "已结束",
  idle: "未开始",
};

export function HomePage() {
  const { data: settings } = useSettings();
  const { data: stats } = useStats();
  const openModal = useUiStore((s) => s.openModal);
  const { notify } = useBrowserNotify();

  const mode = useTimerStore((s) => s.mode);
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const remainingSec = useTimerStore((s) => s.remainingSec);
  const focusCount = useTimerStore((s) => s.focusCount);
  const currentFocusIndex = useTimerStore((s) => s.currentFocusIndex);
  const setConfig = useTimerStore((s) => s.setConfig);
  const startFree = useTimerStore((s) => s.startFree);
  const startPomodoro = useTimerStore((s) => s.startPomodoro);
  const stop = useTimerStore((s) => s.stop);
  const advancePhase = useTimerStore((s) => s.advancePhase);

  const freeStartRef = useRef<string | null>(null);
  const pomoStartRef = useRef<string | null>(null);
  const breakHandledRef = useRef(false);

  useEffect(() => {
    if (settings) {
      setConfig({
        focusMin: settings.focus_min,
        shortBreakMin: settings.short_break_min,
        longBreakMin: settings.long_break_min,
        longBreakInterval: settings.long_break_interval,
      });
    }
  }, [settings, setConfig]);

  useEffect(() => {
    if (mode !== "pomodoro" || status !== "running") return;
    if (phase === "shortBreak" || phase === "longBreak") {
      if (!breakHandledRef.current) {
        breakHandledRef.current = true;
        openModal("break");
      }
    } else if (phase === "focus") {
      breakHandledRef.current = false;
    }
  }, [phase, mode, status, openModal]);

  useEffect(() => {
    if (mode === "free" && phase === "finished" && status === "idle") {
      const duration = Math.floor(remainingSec);
      const startedAt = freeStartRef.current ?? new Date().toISOString();
      openModal("summary", { mode: "free", durationSec: duration, focusCount: 0, startedAt });
      freeStartRef.current = null;
    }
  }, [mode, phase, status, remainingSec, openModal]);

  useTimer((p) => {
    const label = PHASE_LABEL_CN[p] || "";
    notify("StudyFlow", `当前阶段: ${label}`);
  });

  const handleStartFree = () => {
    freeStartRef.current = new Date().toISOString();
    pomoStartRef.current = null;
    startFree();
  };
  const handleStartPomodoro = () => {
    pomoStartRef.current = new Date().toISOString();
    freeStartRef.current = null;
    breakHandledRef.current = false;
    startPomodoro();
  };
  const handleStop = () => {
    if (mode === "free" && phase === "focus") {
      advancePhase();
      return;
    }
    if (mode === "pomodoro" && focusCount > 0) {
      const duration = (settings?.focus_min ?? 25) * 60 * focusCount;
      const startedAt = pomoStartRef.current ?? new Date().toISOString();
      openModal("summary", { mode: "pomodoro", durationSec: duration, focusCount, startedAt });
    }
    stop();
  };

  const total =
    phaseTotalSec({
      phase,
      focusMin: settings?.focus_min ?? 25,
      shortBreakMin: settings?.short_break_min ?? 5,
      longBreakMin: settings?.long_break_min ?? 15,
      longBreakInterval: settings?.long_break_interval ?? 4,
    } as never) || 1;
  const cnLabel = PHASE_LABEL_CN[phase] || "";

  return (
    <div className="space-y-12 sm:space-y-20">
      {status === "idle" ? <IdleHero onFree={handleStartFree} onPomo={handleStartPomodoro} settings={settings} stats={stats} /> : null}

      {status !== "idle" && (
        <div className="card-elevated p-8 sm:p-10 animate-slide-up-spring relative overflow-hidden">
          {/* 装饰渐变光斑 */}
          <div
            className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-eyebrow">
                  {mode === "pomodoro" ? "POMODORO" : "FREE TIMER"} · SESSION {currentFocusIndex || 1}
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mt-1">
                  {cnLabel}
                </h2>
              </div>
              {mode === "pomodoro" && (
                <div className="text-right">
                  <div className="text-eyebrow">已完成</div>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums">{focusCount}</div>
                </div>
              )}
            </div>
            <div className="flex justify-center my-8">
              <TimerRing
                remainingSec={remainingSec}
                totalSec={total}
                label={PHASE_LABEL[phase] || ""}
              />
            </div>
            <TimerControls />
            <div className="mt-6 text-center">
              <button
                onClick={handleStop}
                className="text-xs text-slate-400 hover:text-slate-700 transition"
              >
                结束本次学习并保存总结
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsInline />
    </div>
  );
}

function IdleHero({
  onFree,
  onPomo,
  settings,
  stats,
}: {
  onFree: () => void;
  onPomo: () => void;
  settings: ReturnType<typeof useSettings>["data"];
  stats: ReturnType<typeof useStats>["data"];
}) {
  const focusMin = settings?.focus_min ?? 25;
  const interval = settings?.long_break_interval ?? 4;
  return (
    <>
      {/* Editorial Hero */}
      <section className="space-y-8">
        <div className="text-eyebrow">STUDYFLOW · {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</div>
        <h1 className="text-display text-[clamp(2.5rem,5vw,4.5rem)] text-slate-900 max-w-4xl">
          慢一点, <span className="italic font-serif text-violet-600">深一点</span>.
          <br />
          让学习回到当下.
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
          计时, 总结, 复习. 一个本地小工具, 不联网也能用, AI 接入后才更聪明.
        </p>
      </section>

      {/* Bento: 模式选择 + 今日数据 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 grid-flow-dense">
        <ModeCard
          onClick={onPomo}
          tag="番茄钟"
          title="Pomodoro"
          desc={`${focusMin} 分钟专注 · 每 ${interval} 个长休息`}
          accent="violet"
        />
        <ModeCard
          onClick={onFree}
          tag="自由计时"
          title="Free Timer"
          desc="不限时长, 自由探索"
          accent="slate"
        />
        <StatTile
          label="今日学习"
          value={formatDuration((stats?.today_minutes ?? 0) * 60)}
        />
        <StatTile
          label="今日番茄"
          value={String(stats?.today_pomodoros ?? 0)}
          hint={stats?.today_pomodoros ? "继续加油" : "开始第一个"}
        />
      </section>
    </>
  );
}

function ModeCard({
  onClick,
  tag,
  title,
  desc,
  accent,
}: {
  onClick: () => void;
  tag: string;
  title: string;
  desc: string;
  accent: "violet" | "slate";
}) {
  return (
    <button
      onClick={onClick}
      className={`card-elevated group relative overflow-hidden p-7 text-left ${
        accent === "violet" ? "sm:row-span-1" : ""
      }`}
    >
      <div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            accent === "violet"
              ? "radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)"
              : "radial-gradient(circle, rgba(100,116,139,0.18), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-eyebrow">{tag}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all duration-300"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-slate-900 mt-4 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-500 mt-1.5">{desc}</p>
      </div>
    </button>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-card">
      <div className="text-eyebrow">{label}</div>
      <div className="text-display text-3xl text-slate-900 mt-2 tabular-nums">
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1.5">{hint}</div>}
    </div>
  );
}

function SettingsInline() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [localFocus, setLocalFocus] = useState(25);
  const [localShort, setLocalShort] = useState(5);
  const [localLong, setLocalLong] = useState(15);
  const [localInterval, setLocalInterval] = useState(4);
  useEffect(() => {
    if (settings) {
      setLocalFocus(settings.focus_min);
      setLocalShort(settings.short_break_min);
      setLocalLong(settings.long_break_min);
      setLocalInterval(settings.long_break_interval);
    }
  }, [settings]);

  if (!settings) return null;
  return (
    <section>
      <details className="card-elevated p-6 group">
        <summary className="cursor-pointer flex items-center justify-between list-none">
          <div>
            <div className="text-eyebrow">PREFERENCES</div>
            <h3 className="text-lg font-semibold text-slate-900 mt-1">番茄钟时长</h3>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 transition-transform duration-300 group-open:rotate-90"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </summary>
        <div className="divider my-5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <NumField label="专注 (分)" value={localFocus} setValue={setLocalFocus} min={1} max={240} />
          <NumField label="短休息 (分)" value={localShort} setValue={setLocalShort} min={1} max={60} />
          <NumField label="长休息 (分)" value={localLong} setValue={setLocalLong} min={1} max={120} />
          <NumField label="长休息间隔" value={localInterval} setValue={setLocalInterval} min={2} max={12} />
        </div>
        <button
          onClick={() =>
            updateSettings.mutate({
              focus_min: localFocus,
              short_break_min: localShort,
              long_break_min: localLong,
              long_break_interval: localInterval,
            })
          }
          className="btn-primary mt-5 w-full sm:w-auto sm:px-8"
        >
          保存设置
        </button>
      </details>
    </section>
  );
}

function NumField({ label, value, setValue, min, max }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => setValue(Number(e.target.value))}
        className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-300 transition"
      />
    </label>
  );
}