# What the access gate does and does not protect

## What it is

The site is static. There is no server to ask, so the access code is checked in
the browser against verifiers that ship with the page.

A code is normalised (trimmed, uppercased, spaces removed), run through
PBKDF2-HMAC-SHA256 with a site salt and 150,000 iterations, and compared against
the stored verifiers in `public/data/access.json` using a constant time
comparison.

## What that buys

- A reader cannot see another state's dashboard by editing the URL.
- The codes themselves are not recoverable by reading the page. Deriving one from
  a verifier means running PBKDF2 at 150,000 iterations per guess.
- The page is `noindex, nofollow`, and a strict content security policy blocks
  inline script, third party script and any outbound connection.

## What it does not buy

- **The verifiers are public.** Anyone who loads the page can read them and start
  an offline guessing attack. Codes like `PB-COURT-2026` are guessable from a
  short wordlist, so a motivated attacker will get in.
- **The data is public.** Every state's JSON is served to anyone who requests it,
  gate or no gate. `curl https://<site>/data/kerala.json` needs no code at all.
- **There is no audit trail.** Nothing records who looked at what.

## Read this as

Obfuscation that keeps casual and accidental access out, on content that is
mildly sensitive at most: programme status, names of team members, target dates.
It is appropriate for a POC. It is not appropriate for case data, party details,
draft orders or anything a court would treat as confidential.

## Upgrading when this holds anything real

In rough order of effort:

1. **Netlify site password or team access.** One setting, protects the whole
   site. Good enough when everyone who may read it can share one password.
2. **Netlify Identity plus a gated function.** Readers log in with an email
   invite. Move the state JSON behind a serverless function that checks the
   identity token and the reader's state claim before returning data. This is the
   first option where the data itself is actually protected.
3. **The court's own identity provider.** SSO against the High Court directory,
   with state and role as claims. The right answer for production, and the one
   that gives an audit trail.

Whichever is chosen, the split between `public/app/*` and `public/data/*` stays
the same. Only `store.js` changes: it fetches from an authenticated endpoint
instead of a static path.

## Rotating a code

```bash
npm run access-code -- "NEW-CODE-HERE"
```

Put the printed hex string in the matching `grants[].verifier` in
`public/data/access.json`, then run `npm run validate` and deploy. Changing
`kdf.salt` or `kdf.iterations` invalidates every existing verifier, so all of
them have to be regenerated together.
