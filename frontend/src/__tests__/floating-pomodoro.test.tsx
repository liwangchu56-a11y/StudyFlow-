import { describe, expect, it, beforeEach } from "vitest";
import { useTimerStore } from "../store/timerStore";

describe("FloatingPomodoro logic", () => {
  beforeEach(() => {
    useTimerStore.setState({
      mode: "free",
      phase: "idle",
      status: "idle",
      remainingSec: 0,
      focusCount: 0,
      currentFocusIndex: 0,
    });
  });

  it("idle phase does not need anything to render", () => {
    const s = useTimerStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.status).toBe("idle");
  });

  it("startPomodoro sets phase=focus and remainingSec=focusMin*60", () => {
    useTimerStore.getState().startPomodoro();
    const s = useTimerStore.getState();
    expect(s.phase).toBe("focus");
    expect(s.status).toBe("running");
    expect(s.remainingSec).toBe(s.focusMin * 60);
  });

  it("startFree sets phase=focus, remainingSec=0 (自由计时累加)", () => {
    useTimerStore.getState().startFree();
    const s = useTimerStore.getState();
    expect(s.phase).toBe("focus");
    expect(s.status).toBe("running");
    expect(s.remainingSec).toBe(0);
  });

  it("pause toggles status", () => {
    useTimerStore.getState().startPomodoro();
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().status).toBe("paused");
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("advancePhase on focus end: 第 1 个 → shortBreak (非 longBreakInterval 倍数)", () => {
    useTimerStore.getState().startPomodoro();
    useTimerStore.getState().advancePhase();
    const s = useTimerStore.getState();
    expect(s.phase).toBe("shortBreak");
    expect(s.focusCount).toBe(1);
  });

  it("advancePhase 在第 4 个 focus 后进入 longBreak (默认 longBreakInterval=4)", () => {
    useTimerStore.setState({ mode: "pomodoro", focusCount: 3, currentFocusIndex: 4, phase: "focus", status: "running", remainingSec: 1 });
    useTimerStore.getState().advancePhase();
    const s = useTimerStore.getState();
    expect(s.phase).toBe("longBreak");
    expect(s.focusCount).toBe(4);
  });
});