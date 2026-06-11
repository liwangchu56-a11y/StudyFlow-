import { api } from "./client";
import type { ExtractQAResponse, SummarizeRequest, SummarizeResponse } from "../types/api";

export const ai = {
  summarize: (payload: SummarizeRequest) =>
    api.post<SummarizeResponse>("/ai/summarize", payload),
  extractQA: (text: string) =>
    api.post<ExtractQAResponse>("/ai/extract-qa", { text }),
};