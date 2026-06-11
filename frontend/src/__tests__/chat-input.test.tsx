import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "../components/chat/ChatInput";

describe("ChatInput", () => {
  it("renders placeholder", () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByPlaceholderText(/说点什么/)).toBeInTheDocument();
  });

  it("calls onSend on Enter", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const ta = screen.getByPlaceholderText(/说点什么/);
    fireEvent.change(ta, { target: { value: "你好" } });
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("你好");
  });

  it("Shift+Enter does NOT send", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const ta = screen.getByPlaceholderText(/说点什么/);
    fireEvent.change(ta, { target: { value: "abc" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend with empty text", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const ta = screen.getByPlaceholderText(/说点什么/);
    fireEvent.change(ta, { target: { value: "   " } });
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears textarea after sending", () => {
    render(<ChatInput onSend={() => {}} />);
    const ta = screen.getByPlaceholderText(/说点什么/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "test" } });
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(ta.value).toBe("");
  });

  it("disabled disables Enter send", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);
    const ta = screen.getByPlaceholderText(/说点什么/);
    fireEvent.change(ta, { target: { value: "x" } });
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });
});