import { create } from "zustand";
import type { Phase, SessionMode } from "../types/api";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  mode: SessionMode;
  phase: Phase;
  status: TimerStatus;
  remainingSec: number;
  // 累计完成的专注次数 (用于判断长休息)
  focusCount: number;
  // 当前专注在本次会话中是第几个 (1-based)
  currentFocusIndex: number;
  // 配置 (分钟)
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakInterval: number;

  // actions
  setConfig: (cfg: Partial<Pick<TimerState, "focusMin" | "shortBreakMin" | "longBreakMin" | "longBreakInterval">>) => void;
  startFree: () => void;
  startPomodoro: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: (deltaSec: number) => void;
  /** 内部用: 推进到下一阶段 */
  advancePhase: () => void;
  reset: () => void;
}

const initial = {
  mode: "free" as SessionMode,
  phase: "idle" as Phase,
  status: "idle" as TimerStatus,
  remainingSec: 0,
  focusCount: 0,
  currentFocusIndex: 0,
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakInterval: 4,
};

export const useTimerStore = create<TimerState>((set, get) => ({
  ...initial,

  setConfig: (cfg) => set((s) => ({ ...s, ...cfg })),

  startFree: () =>
    set({
      mode: "free",
      phase: "focus",
      status: "running",
      remainingSec: 0, // 自由计时从 0 累加, 不用倒计
      focusCount: 0,
      currentFocusIndex: 0,
    }),

  startPomodoro: () =>
    set((s) => ({
      mode: "pomodoro",
      phase: "focus",
      status: "running",
      remainingSec: s.focusMin * 60,
      focusCount: 0,
      currentFocusIndex: 1,
    })),

  pause: () =>
    set((s) => (s.status === "running" ? { status: "paused" } : {})),

  resume: () =>
    set((s) => (s.status === "paused" ? { status: "running" } : {})),

  stop: () => set({ ...initial, focusMin: get().focusMin, shortBreakMin: get().shortBreakMin, longBreakMin: get().longBreakMin, longBreakInterval: get().longBreakInterval }),

  tick: (deltaSec) =>
    set((s) => {
      if (s.status !== "running") return {};
      if (s.phase === "finished" || s.phase === "idle") return {};
      if (s.mode === "free") {
        // 自由计时: 累加
        return { remainingSec: s.remainingSec + deltaSec };
      }
      // 倒计时
      const next = s.remainingSec - deltaSec;
      return { remainingSec: Math.max(0, next) };
    }),

  advancePhase: () =>
    set((s) => {
      if (s.mode === "free") {
        // 自由计时停止时: 直接结束
        return { phase: "finished", status: "idle", remainingSec: 0 };
      }
      // pomodoro
      if (s.phase === "focus") {
        // 刚完成一个专注
        const newFocusCount = s.focusCount + 1;
        const isLong = newFocusCount % s.longBreakInterval === 0;
        return {
          phase: isLong ? "longBreak" : "shortBreak",
          remainingSec: (isLong ? s.longBreakMin : s.shortBreakMin) * 60,
          focusCount: newFocusCount,
        };
      }
      // 休息结束 -> 下一个专注
      return {
        phase: "focus",
        remainingSec: s.focusMin * 60,
        currentFocusIndex: s.currentFocusIndex + 1,
      };
    }),

  reset: () => set((s) => ({
    ...initial,
    focusMin: s.focusMin,
    shortBreakMin: s.shortBreakMin,
    longBreakMin: s.longBreakMin,
    longBreakInterval: s.longBreakInterval,
  })),
}));

/** 选择器: 获取 phase 对应的总秒数 */
export function phaseTotalSec(s: TimerState): number {
  if (s.phase === "focus") return s.focusMin * 60;
  if (s.phase === "shortBreak") return s.shortBreakMin * 60;
  if (s.phase === "longBreak") return s.longBreakMin * 60;
  return 0;
}