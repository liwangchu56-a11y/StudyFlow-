// 与后端 schemas.py 字段对齐
export type SessionMode = "free" | "pomodoro";
export type Phase = "idle" | "focus" | "shortBreak" | "longBreak" | "finished";

export interface StudySession {
  id: number;
  mode: SessionMode;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  focus_count: number;
  note: string | null;
  summary: string | null;
  summary_structured: string | null;
}

export interface QACard {
  id: number;
  question: string;
  answer: string;
  tag: string | null;
  source: "manual" | "ai" | "session";
  session_id: number | null;
  mastery: number;
  favorited: boolean;
  created_at: string;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  interval_days: number;
}

export interface Todo {
  id: number;
  title: string;
  priority: 0 | 1 | 2;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Settings {
  focus_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_interval: number;
  ai_enabled: boolean;
}

export interface Stats {
  today_minutes: number;
  today_pomodoros: number;
  total_minutes: number;
  total_focus_sessions: number;
  streak_days: number;
  knowledge_points: number;
  total_cards: number;
  pending_todos: number;
}

export interface DailyPoint {
  date: string;
  minutes: number;
}

export interface SummarizeRequest {
  note: string;
  duration_sec: number;
}

export interface SummarizeResponse {
  summary: string;
  key_points: string[];
  suggestions: string[];
}

export interface QACase {
  question: string;
  answer: string;
  tag?: string;
}

export interface ExtractQAResponse {
  cards: QACase[];
}

// ====== 聊天 (v2 重构) ======
export type ChatRole = "user" | "assistant" | "system";

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  study_session_id: number | null;
  message_count?: number;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: ChatRole;
  content: string;
  meta: string | null;
  created_at: string;
}

export interface ChatSessionDetail {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface PostMessageResponse {
  user: ChatMessage;
  assistant: ChatMessage;
}

// ====== 知识点 (长期记忆) ======
export type ConceptStatus = "active" | "archived";

export interface LearnedConcept {
  id: number;
  name: string;
  category: string | null;
  concept_group: string | null;
  description: string;
  status: ConceptStatus;
  confidence: number;
  source_session_id: number | null;
  source_message_ids: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedConcept {
  name: string;
  description: string;
  category?: string | null;
}

export interface ExtractConceptsResponse {
  concepts: ExtractedConcept[];
}

export interface ConceptGroupSuggestion {
  group: string;
  description: string | null;
  concept_ids: number[];
}

export interface RenameSuggestion {
  id: number;
  new_name: string;
  reason: string | null;
}

export interface ReorganizeResponse {
  groups: ConceptGroupSuggestion[];
  suggested_renames: RenameSuggestion[];
  duplicates: number[][];
}