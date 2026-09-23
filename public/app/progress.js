/**
 * Derived values for a workstream. Everything here is a pure function of the
 * data file plus the stage configuration, so the JSON stays free of anything
 * that can go stale or contradict itself.
 */
import { daysBetween, parseDay, today } from './format.js';

export function stageIndex(stages, id) {
  return stages.findIndex((stage) => stage.id === id);
}

/** Weighted completion across the five stages, 0 to 100. */
export function progressOf(stages, workstream) {
  const index = stageIndex(stages, workstream.stage);
  if (index < 0) return 0;
  const total = stages.reduce((sum, stage) => sum + stage.weight, 0);
  const done = stages.slice(0, index).reduce((sum, stage) => sum + stage.weight, 0);
  const current = (stages[index].weight * clamp(workstream.stageProgress)) / 100;
  return ((done + current) / total) * 100;
}

function clamp(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

export function isLive(stages, workstream) {
  return workstream.stage === stages[stages.length - 1].id && clamp(workstream.stageProgress) === 100;
}

/** Days the target has moved out from the baseline. Zero when nothing slipped. */
export function slippage(workstream) {
  const days = daysBetween(workstream.baseline, workstream.target);
  return days && days > 0 ? days : 0;
}

/** Risk as stored, upgraded to overdue when the target has already passed. */
export function riskOf(stages, workstream, now = today()) {
  if (isLive(stages, workstream)) return 'on-track';
  const target = parseDay(workstream.target);
  if (target && now && target < now) return 'delayed';
  return workstream.risk;
}

function delayExpected(stages, workstream) {
  const risk = riskOf(stages, workstream);
  return risk === 'delayed' || risk === 'blocked';
}

export function summarise(stages, workstreams) {
  const live = workstreams.filter((ws) => isLive(stages, ws));
  const active = workstreams.filter((ws) => !isLive(stages, ws));
  const overall = workstreams.length
    ? workstreams.reduce((sum, ws) => sum + progressOf(stages, ws), 0) / workstreams.length
    : 0;
  const upcoming = active
    .map((ws) => ws.target)
    .filter(Boolean)
    .sort();

  return {
    total: workstreams.length,
    live: live.length,
    inFlight: active.length,
    delayed: active.filter((ws) => riskOf(stages, ws) === 'delayed').length,
    blocked: active.filter((ws) => riskOf(stages, ws) === 'blocked').length,
    atRisk: active.filter((ws) => delayExpected(stages, ws)).length,
    overall,
    nextTarget: upcoming[0] ?? null
  };
}
