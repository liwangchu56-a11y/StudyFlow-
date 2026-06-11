import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FlipCard } from "../components/cards/FlipCard";
import type { QACard } from "../types/api";

const card: QACard = {
  id: 1,
  question: "什么是闭包",
  answer: "函数 + 引用环境",
  tag: "Python",
  source: "manual",
  session_id: null,
  mastery: 1,
  favorited: false,
  created_at: "2026-06-10T08:00:00Z",
  last_reviewed_at: null,
  next_review_at: null,
  interval_days: 0,
};

describe("FlipCard", () => {
  it("renders question initially", () => {
    render(<FlipCard card={card} />);
    expect(screen.getByText("什么是闭包")).toBeInTheDocument();
  });

  it("flips on click to show answer", () => {
    render(<FlipCard card={card} />);
    const btn = screen.getByRole("button", { name: /什么是闭包/ });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("函数 + 引用环境")).toBeInTheDocument();
  });

  it("flips on Enter key", () => {
    render(<FlipCard card={card} />);
    const btn = screen.getByRole("button", { name: /什么是闭包/ });
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onAnswer when buttons clicked", () => {
    const onAnswer = vi.fn();
    render(<FlipCard card={card} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("记得"));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("shows mastery level and tag on front", () => {
    render(<FlipCard card={card} />);
    expect(screen.getByText("L1")).toBeInTheDocument();
    expect(screen.getByText("#Python")).toBeInTheDocument();
  });
});