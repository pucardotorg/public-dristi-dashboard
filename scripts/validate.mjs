#!/usr/bin/env node
/**
 * Checks every data file before it ships. The scheduled update job runs this,
 * so a bad edit fails loudly here instead of quietly rendering a wrong date
 * to a judge.
 *
 *   npm run validate
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA = fileURLToPath(new URL('../public/data/', import.meta.url));
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const problems = [];
const warnings = [];

const read = (file) => JSON.parse(readFileSync(path.join(DATA, file), 'utf8'));

const config = read('config.json');
const access = read('access.json');

const stageIds = config.stages.map((stage) => stage.id);
const riskIds = config.risks.map((risk) => risk.id);
const finalStage = stageIds.at(-1);

function fail(where, message) {
  problems.push(`${where}: ${message}`);
}

function warn(where, message) {
  warnings.push(`${where}: ${message}`);
}

function checkDay(where, field, value, { required = true } = {}) {
  if (value == null) {
    if (required) fail(where, `${field} is missing`);
    return null;
  }
  if (!ISO_DAY.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(where, `${field} is not a valid YYYY-MM-DD date (got ${JSON.stringify(value)})`);
    return null;
  }
  return Date.parse(`${value}T00:00:00Z`);
}

// -------------------------------------------------------------------- config

if (!config.stages.length) fail('config.json', 'no stages defined');
if (config.stages.reduce((sum, stage) => sum + stage.weight, 0) !== 100) {
  fail('config.json', 'stage weights must add up to 100');
}

// -------------------------------------------------------------------- access

const knownStates = new Set(config.states.map((state) => state.slug));
if (!access.kdf?.salt || !(access.kdf?.iterations >= 100000)) {
  fail('access.json', 'kdf needs a salt and at least 100000 iterations');
}
for (const grant of access.grants) {
  const where = `access.json grant ${grant.id}`;
  if (!/^[0-9a-f]{64}$/.test(grant.verifier ?? '')) fail(where, 'verifier must be 64 hex characters');
  if (!grant.states?.length) fail(where, 'grants no states');
  for (const slug of grant.states ?? []) {
    if (!knownStates.has(slug)) fail(where, `unknown state "${slug}"`);
  }
}
const verifiers = access.grants.map((grant) => grant.verifier);
if (new Set(verifiers).size !== verifiers.length) fail('access.json', 'two grants share a verifier');

// --------------------------------------------------------------- state files

for (const { slug, name } of config.states) {
  const where0 = `${slug}.json`;
  let state;
  try {
    state = read(`${slug}.json`);
  } catch (error) {
    fail(where0, `cannot be read (${error.message})`);
    continue;
  }

  if (state.slug !== slug) fail(where0, `slug is "${state.slug}", expected "${slug}"`);
  if (state.name !== name) warn(where0, `name is "${state.name}", config says "${name}"`);
  const updated = checkDay(where0, 'updated', state.updated);
  if (updated && updated > Date.now() + 86400000) fail(where0, 'updated is in the future');
  if (!state.rollout || typeof state.rollout.courtsLive !== 'number') {
    fail(where0, 'rollout.courtsLive must be a number');
  } else if (state.rollout.courtsLive > state.rollout.courtsPlanned) {
    fail(where0, 'rollout.courtsLive exceeds courtsPlanned');
  }
  if (!state.workstreams?.length) fail(where0, 'has no workstreams');

  const seen = new Set();
  for (const ws of state.workstreams ?? []) {
    const where = `${slug}.json ${ws.id ?? '(no id)'}`;
    if (!ws.id) fail(where, 'missing id');
    if (seen.has(ws.id)) fail(where, 'duplicate id');
    seen.add(ws.id);

    for (const field of ['name', 'summary', 'note']) {
      if (!ws[field]?.trim()) fail(where, `${field} is empty`);
    }
    if (!stageIds.includes(ws.stage)) fail(where, `stage "${ws.stage}" is not in config.stages`);
    if (!riskIds.includes(ws.risk)) fail(where, `risk "${ws.risk}" is not in config.risks`);
    if (!(typeof ws.stageProgress === 'number' && ws.stageProgress >= 0 && ws.stageProgress <= 100)) {
      fail(where, 'stageProgress must be a number from 0 to 100');
    }
    if (!ws.owner?.name || !ws.owner?.role) fail(where, 'owner needs a name and a role');
    for (const member of ws.team ?? []) {
      if (!member.name) fail(where, 'a team member has no name');
    }

    const target = checkDay(where, 'target', ws.target);
    const baseline = checkDay(where, 'baseline', ws.baseline);
    const live = ws.stage === finalStage && ws.stageProgress === 100;
    // A deployed workstream keeps its slip on record, but the risk flag is
    // spent: it shipped. Only in flight work has to justify a moved date.
    if (target && baseline && !live) {
      const slipped = target > baseline;
      if (slipped && !['delayed', 'blocked'].includes(ws.risk)) {
        fail(where, 'target is later than baseline, so risk must be "delayed" or "blocked"');
      }
      if (!slipped && ws.risk === 'delayed') {
        fail(where, 'risk is "delayed" but the target has not moved from the baseline');
      }
      if (target < baseline) warn(where, 'target is earlier than baseline, which is unusual');
    }

    if (live) {
      if (ws.risk !== 'on-track') fail(where, 'deployed work should be marked "on-track"');
      const liveSince = checkDay(where, 'liveSince', ws.liveSince);
      if (liveSince && liveSince > Date.now()) fail(where, 'liveSince is in the future');
    } else if (ws.liveSince) {
      fail(where, 'liveSince is set but the work is not deployed');
    }

    // History must cover every stage up to the current one, and only those.
    const currentIndex = stageIds.indexOf(ws.stage);
    const history = ws.history ?? [];
    const historyIds = history.map((entry) => entry.stage);
    for (let i = 0; i <= currentIndex; i += 1) {
      if (!historyIds.includes(stageIds[i])) fail(where, `history is missing the "${stageIds[i]}" stage`);
    }
    for (const entry of history) {
      const at = stageIds.indexOf(entry.stage);
      if (at < 0) fail(where, `history has unknown stage "${entry.stage}"`);
      if (at > currentIndex) fail(where, `history includes "${entry.stage}", which is after the current stage`);
      const from = checkDay(where, `history.${entry.stage}.from`, entry.from);
      if (at < currentIndex && !entry.to) fail(where, `history.${entry.stage} is finished but has no "to" date`);
      if (at === currentIndex && entry.to && !live) {
        fail(where, `history.${entry.stage} is the current stage but already has a "to" date`);
      }
      if (entry.to) {
        const to = checkDay(where, `history.${entry.stage}.to`, entry.to);
        if (from && to && to < from) fail(where, `history.${entry.stage} ends before it starts`);
      }
    }
  }
}

// ------------------------------------------------------------------- report

for (const line of warnings) console.warn(`warn  ${line}`);
for (const line of problems) console.error(`error ${line}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found. Data not fit to publish.`);
  process.exit(1);
}
console.log(`Data looks good. ${config.states.length} states checked, ${warnings.length} warning(s).`);
