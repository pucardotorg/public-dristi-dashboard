/**
 * How far along a workstream is, and which of four states it is in. Both are
 * worked out from the data at render time and never stored.
 */
import { todayIso } from './format.js';

export const STATUSES = [
  { id: 'not-started', label: 'Not started' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Completed' }
];

/**
 * Completion across all five stages, 0 to 100. Stages are weighted (build is
 * the longest), so halfway through build does not read as halfway to live.
 */
export function progressOf(stages, ws) {
  const index = stages.findIndex((stage) => stage.id === ws.stage);
  if (index < 0) return 0;
  const total = stages.reduce((sum, stage) => sum + stage.weight, 0);
  const done = stages.slice(0, index).reduce((sum, stage) => sum + stage.weight, 0);
  const within = Math.min(100, Math.max(0, ws.stageProgress)) / 100;
  return Math.round(((done + stages[index].weight * within) / total) * 100);
}

export function isLive(stages, ws) {
  return ws.stage === stages.at(-1).id && ws.stageProgress === 100;
}

/** Completed beats blocked, and blocked beats not started. */
export function statusOf(stages, ws, today = todayIso()) {
  if (isLive(stages, ws)) return 'done';
  if (ws.risk === 'blocked') return 'blocked';
  const started = ws.history?.[0]?.from;
  if (progressOf(stages, ws) === 0 || (started && started > today)) return 'not-started';
  return 'in-progress';
}
