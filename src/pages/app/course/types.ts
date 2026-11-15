/* What /api/course* answers (server/routes/course.ts), as the Course tab reads it. */
import type {SessionView} from '../../../../server/plan-content';
import type {LessonText} from '../../../../server/course-content';
import type {Streak} from '../../../../server/calm-days';

export type {LessonText, Streak};

export interface ModuleRow { id: string; title: string; sub: string; icon: string; open: boolean; why: string; done: number; total: number; days: string[]; seasonal: boolean }
export interface Summary {
  from: string; to: string; messages: number; calm: number; hot: number; skipped: number; lessons: number;
  coming: string[]; pdf: string; sunday: boolean;
}
export interface CourseHome {
  day: number; total: number; finished: boolean; demo: boolean; now: string;
  streak: Streak;
  summary: Summary | null;
  modules: ModuleRow[];
  next: (ModuleRow & {nextDay: number; dayTitle: string}) | null;
  daily: {ref: string; topics: string[]; from: 'record' | 'quiz' | 'bank'; done: boolean;
    today: {day: number; module: string; title: string} | null; next: {day: number; module: string; title: string} | null} | null;
  weeksDone: number[];
}
export interface LessonPack {
  ref: string; kind: 'day' | 'mod' | 'daily'; label: string; title: string; lesson: LessonText | null; session: SessionView;
  you?: string; did: string; week?: number; topics?: string[]; from?: string; chat?: string[]; tryToday?: string;
  checkIn: {id: string; task: string} | null; streak: number;
}
export interface DoneRes { ok: true; streak: Streak; correct: number; total: number }
export interface WeekView {
  week: number; title: string; sub: string; finished: boolean;
  skills: {day: number; you: string; done: boolean; open: boolean}[];
  cal: {day: number; at: string; lesson: boolean; tried: boolean; today: boolean}[];
  log: {day: number; did: string; at: string}[];
  next: {week: number; title: string; day: number; dayTitle: string; inDays: number} | null;
}
