import { describe, expect, it } from "vitest";
import { formatClock, formatDate, formatDuration, priorityText } from "../lib/format";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });
  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2m 5s");
  });
  it("formats hours and minutes", () => {
    expect(formatDuration(3725)).toBe("1h 2m");
  });
  it("treats negative as zero", () => {
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("formatClock", () => {
  it("zero-pads minutes and seconds", () => {
    expect(formatClock(65)).toBe("01:05");
  });
  it("handles long durations", () => {
    expect(formatClock(3725)).toBe("62:05");
  });
  it("handles zero", () => {
    expect(formatClock(0)).toBe("00:00");
  });
});

describe("formatDate", () => {
  it("returns empty for null", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
  it("formats ISO string to local MM/DD HH:mm", () => {
    const out = formatDate("2026-06-10T08:30:00Z");
    expect(out).toMatch(/06\/10/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});

describe("priorityText", () => {
  it("translates priority", () => {
    expect(priorityText(0)).toBe("高");
    expect(priorityText(1)).toBe("中");
    expect(priorityText(2)).toBe("低");
  });
});