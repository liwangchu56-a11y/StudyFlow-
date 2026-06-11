import { describe, expect, it } from "vitest";
import { parseQA } from "../lib/parseQA";

describe("parseQA", () => {
  it("returns empty for empty input", () => {
    expect(parseQA("")).toEqual([]);
    expect(parseQA("   \n\n  ")).toEqual([]);
  });

  it("parses single Q/A pair on one line", () => {
    const r = parseQA("Q: 什么是闭包?\nA: 函数 + 引用环境");
    expect(r).toEqual([{ question: "什么是闭包?", answer: "函数 + 引用环境" }]);
  });

  it("parses Q on one line, A on next line", () => {
    const r = parseQA("Q: 什么是装饰器\nA: 接受函数返回函数的语法糖");
    expect(r).toEqual([{ question: "什么是装饰器", answer: "接受函数返回函数的语法糖" }]);
  });

  it("parses plain text as question with empty answer", () => {
    const r = parseQA("这是一个普通问题");
    expect(r).toEqual([{ question: "这是一个普通问题", answer: "" }]);
  });

  it("parses multi-line answer", () => {
    const r = parseQA("Q: 列举 3 个特点\nA: 第一条\n第二条\n第三条");
    expect(r).toEqual([
      { question: "列举 3 个特点", answer: "第一条\n第二条\n第三条" },
    ]);
  });

  it("splits multiple cards by blank line", () => {
    const text = `Q: 什么是闭包
A: 函数 + 引用环境

Q: 什么是装饰器
A: 接受函数返回函数

Q: 什么是生成器
A: 带 yield 的函数`;
    const r = parseQA(text);
    expect(r).toHaveLength(3);
    expect(r[0].question).toBe("什么是闭包");
    expect(r[1].question).toBe("什么是装饰器");
    expect(r[2].answer).toBe("带 yield 的函数");
  });

  it("supports Chinese Q/A prefixes (问/答)", () => {
    const r = parseQA("问: 什么是 X\n答: X 是 Y");
    expect(r).toEqual([{ question: "什么是 X", answer: "X 是 Y" }]);
  });

  it("supports fullwidth colon", () => {
    const r = parseQA("Q：什么是迭代器\nA：实现 __iter__ 的对象");
    expect(r).toEqual([{ question: "什么是迭代器", answer: "实现 __iter__ 的对象" }]);
  });

  it("appends non-prefixed lines to answer", () => {
    const r = parseQA("Q: 解释 Python GIL\n答案: 全局解释器锁\n同一时刻只允许一个线程执行");
    expect(r).toEqual([
      { question: "解释 Python GIL", answer: "全局解释器锁\n同一时刻只允许一个线程执行" },
    ]);
  });

  it("applies default tag to all parsed cards", () => {
    const r = parseQA("Q: Q1\nA: A1\n\nQ: Q2\nA: A2", "Python");
    expect(r[0].tag).toBe("Python");
    expect(r[1].tag).toBe("Python");
  });

  it("ignores blocks that produce no question", () => {
    const r = parseQA("A: only answer\n\nQ: real Q\nA: real A");
    expect(r).toHaveLength(1);
    expect(r[0].question).toBe("real Q");
  });
});