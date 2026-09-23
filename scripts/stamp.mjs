#!/usr/bin/env node
/**
 * Sets the "updated" date on a state file to today. The scheduled update job
 * runs this after editing a state, so the page never claims to be fresher or
 * staler than it is.
 *
 *   npm run stamp -- punjab
 *   npm run stamp -- all
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA = fileURLToPath(new URL('../public/data/', import.meta.url));
const today = new Date().toISOString().slice(0, 10);

const config = JSON.parse(readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const slugs = config.states.map((state) => state.slug);

const [argument] = process.argv.slice(2);
if (!argument) {
  console.error(`usage: npm run stamp -- <${slugs.join('|')}|all>`);
  process.exit(2);
}

const targets = argument === 'all' ? slugs : [argument];
for (const slug of targets) {
  if (!slugs.includes(slug)) {
    console.error(`Unknown state "${slug}". Known states: ${slugs.join(', ')}`);
    process.exit(2);
  }
  const file = path.join(DATA, `${slug}.json`);
  const state = JSON.parse(readFileSync(file, 'utf8'));
  state.updated = today;
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`${slug}.json updated ${today}`);
}
