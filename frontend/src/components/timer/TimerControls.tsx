import { useTimerStore } from "../../store/timerStore";

export function TimerControls() {
  const status = useTimerStore((s) => s.status);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const stop = useTimerStore((s) => s.stop);

  return (
    <div className="flex gap-3 justify-center items-center">
      {status === "running" && (
        <button onClick={pause} className="btn-ghost min-w-[120px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          暂停
        </button>
      )}
      {status === "paused" && (
        <button onClick={resume} className="btn-primary min-w-[120px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          继续
        </button>
      )}
      {status !== "idle" && (
        <button onClick={stop} className="btn-ghost min-w-[120px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
          结束
        </button>
      )}
    </div>
  );
}