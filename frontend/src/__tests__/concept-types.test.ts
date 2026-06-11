import { describe, expect, it } from "vitest";
import type { LearnedConcept, ReorganizeResponse } from "../types/api";

describe("Concept types", () => {
  it("LearnedConcept has all required fields", () => {
    const c: LearnedConcept = {
      id: 1,
      name: "闭包",
      category: "Python",
      concept_group: "Python 基础",
      description: "函数 + 引用环境",
      status: "active",
      confidence: 0.9,
      source_session_id: null,
      source_message_ids: null,
      created_at: "2026-06-10T08:00:00Z",
      updated_at: "2026-06-10T08:00:00Z",
    };
    expect(c.name).toBe("闭包");
    expect(c.concept_group).toBe("Python 基础");
  });

  it("ReorganizeResponse shape", () => {
    const r: ReorganizeResponse = {
      groups: [{ group: "Python", description: "Python 概念", concept_ids: [1, 2] }],
      suggested_renames: [{ id: 1, new_name: "Python 闭包", reason: "更清晰" }],
      duplicates: [[1, 2]],
    };
    expect(r.groups).toHaveLength(1);
    expect(r.duplicates[0]).toEqual([1, 2]);
  });
});