/**
 * Access code gate.
 *
 * The site is static, so the check runs in the browser against verifiers that
 * ship with the page. PBKDF2 at 150k iterations makes guessing a code slow,
 * but a determined reader of the page source can still attack the verifier
 * offline. This is a soft gate suited to a POC. docs/SECURITY.md records the
 * upgrade path for anything holding real case data.
 */
const SESSION_KEY = 'pucar.session.v1';

function normalise(code) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function derive(code, { salt, iterations }) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(normalise(code)), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
    key,
    256
  );
  return toHex(bits);
}

/** Constant time comparison so the check does not leak a prefix match. */
function equals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verify(code, access) {
  const candidate = await derive(code, access.kdf);
  const grant = access.grants.find((entry) => equals(entry.verifier, candidate));
  return grant ? { id: grant.id, label: grant.label, states: grant.states } : null;
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* Private browsing can refuse storage. The session then lasts one page view. */
  }
}

export function loadSession() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored);
    return Array.isArray(session?.states) && session.states.length ? session : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Nothing to clear. */
  }
}
