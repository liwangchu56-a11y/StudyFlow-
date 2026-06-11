import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "../components/chat/ChatMessage";
import type { ChatMessage as Msg } from "../types/api";

const baseMsg: Msg = {
  id: 1,
  session_id: 1,
  role: "user",
  content: "帮我理解闭包",
  meta: null,
  created_at: "2026-06-10T08:00:00Z",
};

describe("ChatMessage", () => {
  it("renders user message text", () => {
    render(<ChatMessage message={baseMsg} />);
    expect(screen.getByText("帮我理解闭包")).toBeInTheDocument();
  });

  it("renders assistant message text", () => {
    render(
      <ChatMessage
        message={{ ...baseMsg, id: 2, role: "assistant", content: "闭包是..." }}
      />,
    );
    expect(screen.getByText("闭包是...")).toBeInTheDocument();
  });

  it("renders code block fenced in triple backticks", () => {
    render(
      <ChatMessage
        message={{
          ...baseMsg,
          id: 3,
          role: "assistant",
          content: "看这段:\n```\nfunction f() { return 1 }\n```\n结束",
        }}
      />,
    );
    expect(screen.getByText(/function f/)).toBeInTheDocument();
    expect(screen.getByText(/结束/)).toBeInTheDocument();
  });

  it("renders system message as a pill in the middle", () => {
    render(
      <ChatMessage
        message={{ ...baseMsg, id: 4, role: "system", content: "[pomodoro_end] 完成 25 分钟" }}
      />,
    );
    const pill = screen.getByText("[pomodoro_end] 完成 25 分钟");
    expect(pill).toBeInTheDocument();
  });
});