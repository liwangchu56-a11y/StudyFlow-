/** 艾宾浩斯间隔: 等级 0..5 对应 1/3/7/15/30/60 天 */
export const MAX_MASTERY = 5;
export const INTERVALS: readonly number[] = [1, 3, 7, 15, 30, 60] as const;

export function intervalForMastery(mastery: number): number {
  const idx = Math.max(0, Math.min(mastery, MAX_MASTERY));
  return INTERVALS[idx];
}

export function nextReviewDate(now: Date, mastery: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + intervalForMastery(mastery));
  return d;
}

export interface ReviewResult {
  mastery: number;
  intervalDays: number;
  nextReviewAt: Date;
}

export function schedulePassed(currentMastery: number, now: Date): ReviewResult {
  const mastery = Math.min(currentMastery + 1, MAX_MASTERY);
  const interval = intervalForMastery(mastery);
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  return { mastery, intervalDays: interval, nextReviewAt };
}

export function scheduleFailed(currentMastery: number, now: Date): ReviewResult {
  const mastery = 0;
  const interval = intervalForMastery(mastery);
  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  return { mastery, intervalDays: interval, nextReviewAt };
}