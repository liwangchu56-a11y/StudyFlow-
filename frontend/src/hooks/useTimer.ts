import { useEffect, useRef } from "react";
import { useTimerStore } from "../store/timerStore";
import type { Phase } from "../types/api";

/** 启动后台 tick, 每 250ms 推进 0.25s. 返回 actions. */
export function useTimer(onPhaseChange?: (phase: Phase) => void) {
  const tick = useTimerStore((s) => s.tick);
  const advancePhase = useTimerStore((s) => s.advancePhase);
  const phase = useTimerStore((s) => s.phase);
  const status = useTimerStore((s) => s.status);
  const mode = useTimerStore((s) => s.mode);
  const remainingSec = useTimerStore((s) => s.remainingSec);

  const prevPhaseRef = useRef<Phase>(phase);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      tick(1);
    }, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  // phase 变化时: 检测倒计时归零 → advancePhase
  useEffect(() => {
    if (status === "running" && mode === "pomodoro" && remainingSec === 0 && phase !== "idle" && phase !== "finished") {
      advancePhase();
    }
  }, [status, mode, remainingSec, phase, advancePhase]);

  // 通知外部 phase 切换
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      onPhaseChange?.(phase);
      prevPhaseRef.current = phase;
    }
  }, [phase, onPhaseChange]);

  // 模式切换
  useEffect(() => {
    prevModeRef.current = mode;
  }, [mode]);
}