import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTimerStore } from "../store/timerStore";

beforeEach(() => {
  useTimerStore.getState().reset();
  useTimerStore.getState().setConfig({
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakInterval: 4,
  });
});

describe("timerStore.startPomodoro", () => {
  it("sets mode=pomodoro, phase=focus, status=running, remaining=focusMin*60", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
    });
    const s = useTimerStore.getState();
    expect(s.mode).toBe("pomodoro");
    expect(s.phase).toBe("focus");
    expect(s.status).toBe("running");
    expect(s.remainingSec).toBe(25 * 60);
    expect(s.currentFocusIndex).toBe(1);
  });
});

describe("timerStore.startFree", () => {
  it("sets mode=free, phase=focus, status=running, remaining=0 (counts up)", () => {
    act(() => {
      useTimerStore.getState().startFree();
    });
    const s = useTimerStore.getState();
    expect(s.mode).toBe("free");
    expect(s.phase).toBe("focus");
    expect(s.remainingSec).toBe(0);
  });
});

describe("timerStore.tick", () => {
  it("decrements remaining in pomodoro focus", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().tick(60);
    });
    expect(useTimerStore.getState().remainingSec).toBe(25 * 60 - 60);
  });
  it("increments remaining in free mode", () => {
    act(() => {
      useTimerStore.getState().startFree();
      useTimerStore.getState().tick(30);
    });
    expect(useTimerStore.getState().remainingSec).toBe(30);
  });
  it("clamps remaining to 0 (no negative)", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().tick(99 * 60);
    });
    expect(useTimerStore.getState().remainingSec).toBe(0);
  });
  it("does nothing when not running", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().pause();
      const before = useTimerStore.getState().remainingSec;
      useTimerStore.getState().tick(60);
      expect(useTimerStore.getState().remainingSec).toBe(before);
    });
  });
});

describe("timerStore.pause / resume", () => {
  it("pause sets status=paused, resume sets status=running", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().pause();
    });
    expect(useTimerStore.getState().status).toBe("paused");
    act(() => {
      useTimerStore.getState().resume();
    });
    expect(useTimerStore.getState().status).toBe("running");
  });
  it("pause has no effect when not running", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().pause();
      useTimerStore.getState().pause();
    });
    expect(useTimerStore.getState().status).toBe("paused");
  });
});

describe("timerStore.advancePhase", () => {
  it("focus -> shortBreak after first focus", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().advancePhase();
    });
    const s = useTimerStore.getState();
    expect(s.phase).toBe("shortBreak");
    expect(s.remainingSec).toBe(5 * 60);
    expect(s.focusCount).toBe(1);
  });
  it("long break triggered every longBreakInterval focuses (default 4)", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      // 完成 4 个专注: 每个 focus 由 1 次 advance 结束, 中间还有 break -> focus
      // 顺序: focus1 -> shortBreak -> focus2 -> shortBreak -> focus3 -> shortBreak -> focus4 -> longBreak
      for (let i = 0; i < 7; i++) {
        useTimerStore.getState().advancePhase();
      }
    });
    const s = useTimerStore.getState();
    expect(s.focusCount).toBe(4);
    expect(s.phase).toBe("longBreak");
    expect(s.remainingSec).toBe(15 * 60);
  });
  it("shortBreak -> focus continues pomodoro cycle", () => {
    act(() => {
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().advancePhase();
      useTimerStore.getState().advancePhase();
    });
    const s = useTimerStore.getState();
    expect(s.phase).toBe("focus");
    expect(s.remainingSec).toBe(25 * 60);
    expect(s.currentFocusIndex).toBe(2);
  });
  it("free mode: advancePhase sets phase=finished", () => {
    act(() => {
      useTimerStore.getState().startFree();
      useTimerStore.getState().advancePhase();
    });
    const s = useTimerStore.getState();
    expect(s.phase).toBe("finished");
    expect(s.status).toBe("idle");
  });
});

describe("timerStore.stop", () => {
  it("resets to initial state but keeps config", () => {
    act(() => {
      useTimerStore.getState().setConfig({ focusMin: 30 });
      useTimerStore.getState().startPomodoro();
      useTimerStore.getState().stop();
    });
    const s = useTimerStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.status).toBe("idle");
    expect(s.focusMin).toBe(30);
  });
});

describe("timerStore.setConfig", () => {
  it("updates focus duration", () => {
    act(() => {
      useTimerStore.getState().setConfig({ focusMin: 50 });
    });
    expect(useTimerStore.getState().focusMin).toBe(50);
  });
});