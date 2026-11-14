import type {Me, PlanState, QuizAnswers} from '../shared/types.js';
import {personNow, type PersonRow} from './db.js';

export const FREE_REPLIES = 3;

export function planState(p: PersonRow): PlanState {
  if (!p.plan_until) return 'none';
  return new Date(p.plan_until) > personNow(p) ? 'active' : 'expired';
}

/** Day of the 28-day plan, counted from the plan start (or from sign-up for guests), on the person's own clock. */
export function planDay(p: PersonRow): number {
  const start = new Date(p.plan_started ?? p.created_at).getTime();
  return Math.max(1, Math.floor((personNow(p).getTime() - start) / 86_400_000) + 1);
}

export function toMe(p: PersonRow): Me {
  return {
    id: p.id,
    demo: !!p.demo,
    name: p.name ?? undefined,
    email: p.email ?? undefined,
    quiz: p.quiz_json ? (JSON.parse(p.quiz_json) as QuizAnswers) : undefined,
    plan: {state: planState(p), tier: (p.plan_tier as Me['plan']['tier']) ?? undefined, until: p.plan_until ?? undefined, startedAt: p.plan_started ?? undefined},
    day: planDay(p),
    now: personNow(p).toISOString(),
    freeRepliesLeft: Math.max(0, FREE_REPLIES - p.free_replies_used),
  };
}
