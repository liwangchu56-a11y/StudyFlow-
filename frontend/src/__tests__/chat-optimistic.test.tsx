import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ChatMessage } from "../components/chat/ChatMessage";
import type { ChatMessage as Msg } from "../types/api";
import * as chatApi from "../api/chat";

function makeMsg(over: Partial<Msg> = {}): Msg {
  return {
    id: 1,
    session_id: 1,
    role: "user",
    content: "hello",
    meta: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

describe("ChatMessage optimistic states", () => {
  it("renders user message content", () => {
    render(<ChatMessage message={makeMsg({ role: "user", content: "你好" })} />);
    expect(screen.getByText("你好")).toBeInTheDocument();
  });

  it("renders pending assistant as dot bubble (no content)", () => {
    const { container } = render(
      <ChatMessage
        message={makeMsg({ id: -999, role: "assistant", content: "", meta: "__pending__" })}
      />,
    );
    expect(container.textContent).toBe("");
    const dots = container.querySelectorAll(".animate-pulse");
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it("renders streaming assistant (has content + pending) with caret", () => {
    const { container } = render(
      <ChatMessage
        message={makeMsg({ id: -888, role: "assistant", content: "Hi there", meta: "__pending__" })}
      />,
    );
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    const caret = container.querySelector(".animate-pulse");
    expect(caret).toBeInTheDocument();
  });
});

describe("postMessageStream SSE parsing", () => {
  const origFetch = global.fetch;
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = origFetch;
  });

  function sse(events: Array<[string, any]>): ReadableStream<Uint8Array> {
    const body = events.map(([ev, data]) => "event: " + ev + "\ndata: " + JSON.stringify(data) + "\n\n").join("");
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    });
  }

  it("dispatches user/delta/done in order", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        sse([["user", { id: 10, role: "user" }], ["delta", { content: "你" }], ["delta", { content: "好" }], ["done", { id: 20, full: "你好" }]]),
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      ),
    ) as any;

    const events: string[] = [];
    await chatApi.postMessageStream(7, { content: "hi" }, {
      onUser: (u) => events.push("user:" + u.id),
      onDelta: (c) => events.push("delta:" + c),
      onDone: (d) => events.push("done:" + d.id + "=" + d.full),
      onError: (e) => events.push("err:" + e),
    });

    expect(events).toEqual(["user:10", "delta:你", "delta:好", "done:20=你好"]);
  });

  it("dispatches onError on error event", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(sse([["error", { detail: "boom" }]]), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    ) as any;

    const errs: string[] = [];
    await chatApi.postMessageStream(7, { content: "x" }, {
      onDelta: () => {},
      onError: (e) => errs.push(e),
    });
    expect(errs).toEqual(["boom"]);
  });
});
