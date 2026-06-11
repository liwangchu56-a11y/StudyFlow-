import { describe, expect, it } from "vitest";
import {
  intervalForMastery,
  MAX_MASTERY,
  nextReviewDate,
  scheduleFailed,
  schedulePassed,
} from "../lib/ebbinghaus";

describe("intervalForMastery", () => {
  it("returns correct interval for each level", () => {
    expect(intervalForMastery(0)).toBe(1);
    expect(intervalForMastery(1)).toBe(3);
    expect(intervalForMastery(2)).toBe(7);
    expect(intervalForMastery(3)).toBe(15);
    expect(intervalForMastery(4)).toBe(30);
    expect(intervalForMastery(5)).toBe(60);
  });
  it("clamps high values", () => {
    expect(intervalForMastery(99)).toBe(60);
  });
});

describe("MAX_MASTERY", () => {
  it("is 5", () => {
    expect(MAX_MASTERY).toBe(5);
  });
});

describe("nextReviewDate", () => {
  it("adds interval days", () => {
    const today = new Date("2026-06-10T12:00:00Z");
    const nxt = nextReviewDate(today, 2);
    expect(nxt.toISOString()).toBe("2026-06-17T12:00:00.000Z");
  });
});

describe("schedulePassed", () => {
  it("increments mastery and computes next date", () => {
    const today = new Date("2026-06-10T09:00:00Z");
    const r = schedulePassed(0, today);
    expect(r.mastery).toBe(1);
    expect(r.intervalDays).toBe(3);
    expect(r.nextReviewAt.toISOString()).toBe("2026-06-13T09:00:00.000Z");
  });
  it("caps at MAX_MASTERY", () => {
    const r = schedulePassed(5, new Date("2026-06-10T09:00:00Z"));
    expect(r.mastery).toBe(5);
    expect(r.intervalDays).toBe(60);
  });
});

describe("scheduleFailed", () => {
  it("resets to 0 and 1 day", () => {
    const r = scheduleFailed(3, new Date("2026-06-10T09:00:00Z"));
    expect(r.mastery).toBe(0);
    expect(r.intervalDays).toBe(1);
  });
});