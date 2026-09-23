# Court Deployment Tracker

A static, access gated dashboard that tells anyone in a court, a judge included,
exactly where their state stands in the PUCAR rollout: what is being built, which
stage it is in, who is working on it, when it is expected to go live, and whether
a delay is expected.

Four states are covered: Punjab, Haryana, Kerala and Gujarat. An access code
decides which one a reader sees.

## What a reader sees

1. **Access gate.** One code, no accounts. The code maps to one or more states.
2. **State overview.** Weighted overall progress, courts live out of courts
   planned, count of workstreams where a delay is expected, and the next go live
   date.
3. **Workstream list.** One row per piece of work, showing the five stage
   pipeline, a progress bar, the owner, the target date, and a flag when the date
   has moved. Rows expand for the team, the date history and a plain language note.

### The five stages

| Stage | Weight in the progress bar |
| --- | --- |
| Scoping | 10 |
| Design & development | 40 |
| Internal testing | 20 |
| User testing | 20 |
| Deployment | 10 |

Weights sit in `public/data/config.json`. They are unequal on purpose: build is
the longest stage, so a workstream halfway through the build should not read as
halfway to production. Overall state progress is the mean of its workstreams.

## Layout

```
public/              everything Netlify serves
  index.html
  styles.css
  favicon.svg
  app/               ES modules, no build step, no dependencies
    main.js          routing between gate and dashboard
    auth.js          access code check (PBKDF2 via WebCrypto)
    store.js         fetches the JSON
    progress.js      every derived number, as pure functions
    format.js        dates, initials, plurals
    theme.js         light and dark
    html.js          escaping template helper
    views/           gate.js, dashboard.js
  data/              the only files the scheduled update touches
    config.json      stages, risk flags, state registry
    access.json      KDF settings and access code verifiers
    punjab.json  haryana.json  kerala.json  gujarat.json
scripts/
  validate.mjs       data checks, runs on every Netlify build
  stamp.mjs          sets a state's "updated" date to today
  access-code.mjs    derives a verifier for a new access code
  serve.mjs          local static server
docs/
  UPDATING.md        the procedure the scheduled Claude run follows
  SECURITY.md        what the gate does and does not protect
```

No framework, no bundler, no `node_modules`. The scripts use only the Node
standard library, so `npm install` is never needed.

## Running it locally

```bash
npm run serve
```

Then open http://localhost:4173.

POC access codes:

| Code | Sees |
| --- | --- |
| `PB-COURT-2026` | Punjab |
| `HR-COURT-2026` | Haryana |
| `KL-COURT-2026` | Kerala |
| `GJ-COURT-2026` | Gujarat |
| `PUCAR-PMO-2026` | All four, with a court switcher |

Codes are case and space insensitive.

## Checking the data

```bash
npm run validate
```

The validator refuses to pass on a missing owner, an invalid stage, a date that
is not `YYYY-MM-DD`, a stage history that skips a stage, a target that moved
without the risk flag being set to `delayed` or `blocked`, and a dozen similar
mistakes. Netlify runs it as the build command, so bad data fails the deploy
instead of reaching a judge.

## Deploying to Netlify

`netlify.toml` is already set up:

- publish directory `public`
- build command `node scripts/validate.mjs`
- security headers, including a `default-src 'none'` content security policy
- `no-cache` on `/data/*` so a status update is visible immediately

Connect the repository to a Netlify site and deploy. Nothing else to configure.

## Updating the status

Data lives in four JSON files and nowhere else. Editing `public/data/punjab.json`
and pushing is the whole update. See [docs/UPDATING.md](docs/UPDATING.md) for the
procedure the scheduled run follows.

## Assumptions in this POC

- The five stages are the same for every state and every workstream.
- Workstream content, people and dates are illustrative, structured to match how
  the programme actually reports, but not drawn from live plans.
- `baseline` is the first committed target date. The gap between `baseline` and
  `target` is what the dashboard calls a delay.
- A court sees only its own state, and the programme office sees all four.
- The gate is a soft gate. See [docs/SECURITY.md](docs/SECURITY.md).
