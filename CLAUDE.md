# Working in this repository

A static, access gated deployment tracker served from `public/` by Netlify.
Judges and court staff read it to see where their state's rollout stands.

## Ground rules

- **No dependencies and no build step.** Browser code is plain ES modules,
  scripts use only the Node standard library. Do not add a bundler, a framework
  or a package to `dependencies`. If something seems to need one, say so rather
  than adding it.
- **Data and code stay separate.** Status lives only in `public/data/*.json`.
  Nothing about a specific workstream, person or date belongs in a `.js` file.
- **Derived numbers are computed, never stored.** Progress, slip in days and risk
  escalation are pure functions in `public/app/progress.js`. Never add a
  precomputed `progress` or `daysLate` field to the JSON: it goes stale.
- **`npm run validate` must pass before anything is published.** It is also the
  Netlify build command, so a bad edit fails the deploy.
- **Interpolated data is escaped.** Use the `html` tagged template from
  `public/app/html.js`. `raw()` is only for markup this codebase generated.
- **No inline script or style.** The content security policy in `netlify.toml` is
  `default-src 'none'` with `script-src 'self'`, and inline handlers will not run.

## Writing for this audience

The reader may be a judge with no interest in software delivery. Write plainly:
no jargon, no hedging, no marketing. A `note` field says what is happening and,
if a date moved, why. Never use an em dash.

## Scheduled status updates

Follow [docs/UPDATING.md](docs/UPDATING.md) exactly. In short: edit the state
JSON, `npm run stamp -- <slug>`, `npm run validate`, then commit and push.

Never adjust `baseline` to make a slip disappear. A moved `target` must carry a
`delayed` or `blocked` risk flag, and the validator will reject it otherwise.

## The access gate

Client side, and therefore soft. Read [docs/SECURITY.md](docs/SECURITY.md) before
changing anything in `public/app/auth.js` or `public/data/access.json`, and do not
describe the gate as securing the data, because it does not.
