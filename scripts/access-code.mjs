#!/usr/bin/env node
/**
 * Derives the stored verifier for an access code.
 *
 * Usage:
 *   node scripts/access-code.mjs "PB-COURT-2026"
 *
 * The site is static, so verification happens in the browser. PBKDF2 with a
 * high iteration count means a leaked verifier is expensive to brute force,
 * but anyone who can read the page can read the verifier. Treat access codes
 * as a soft gate for a POC, not as a security boundary. See docs/SECURITY.md.
 */
import { pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CONFIG = JSON.parse(readFileSync(new URL('../public/data/access.json', import.meta.url)));

export function normalise(code) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function verifier(code, { salt, iterations }) {
  return pbkdf2Sync(normalise(code), salt, iterations, 32, 'sha256').toString('hex');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [code] = process.argv.slice(2);
  if (!code) {
    console.error('usage: node scripts/access-code.mjs "<ACCESS-CODE>"');
    process.exit(2);
  }
  console.log(verifier(code, CONFIG.kdf));
}
