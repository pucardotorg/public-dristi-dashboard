# DRISTI 2.0 Deployment Tracker

A static, access gated dashboard that tells anyone in a court, a judge included,
exactly where their state stands in the DRISTI 2.0 rollout: what is being built, which
stage it is in, who is working on it, when it is expected to go live, and whether
a delay is expected.

Four states are covered: Punjab, Haryana, Kerala and Gujarat. An access code
decides which one a reader sees.

## What a reader sees

1. **Access gate.** One code, no accounts. The code maps to one or more states.
2. **The stage board.** Five columns, one per stage, running left to right in the
   order work moves through them. Each column carries its number, its name, a
   count, a one line description of what happens at that stage, and a stack of
   faces showing who is working at that stage.
3. **A card per workstream**, in the column it has reached, showing its deadline
   and the people on it. Clicking a card opens its detail: what it is, the
   deadline, the latest note, everyone named on it, and the files attached.
4. **A stack of faces** opens the full list of people at that stage.
5. **A profile page per person**, reached from any face or name: who they are and
   every workstream they are named on, across the courts the reader may see.
6. **A timeline**, every workstream as a bar from when it started to when it is
   due, at week, month or quarter scale, filterable by stage and by person.
7. **The court switcher**, for a reader whose code covers more than one state.

### The five stages

Scoping, Design & development, Internal testing, User testing, Deployment.

They are defined in `public/data/config.json`. Colour appears exactly once per
stage, on the numbered dot and on that stage's timeline bars, running gray
through to green so the order reads as progress.

### Routes

The app is one page with hash routing, so every view is linkable:

| Route | View |
| --- | --- |
| `#/court/<slug>` | the board for that court |
| `#/court/<slug>/timeline` | the timeline for that court |
| `#/court/<slug>/ws/<id>` | the board with that card's detail already open |
| `#/person/<id>` | that person's profile |

### Timeline scales

The header is driven by a unit table in `public/app/views/timeline.js`. A unit
says where to snap the origin, how to count columns from it, how to step
forward, what its two header lines read, and optionally how to group columns
into a band above them. Adding a fortnight or a half year means adding one
entry, not touching the drawing code.

| Scale | Column | Band | Header lines |
| --- | --- | --- | --- |
| Days | one day | month and year | date, then the weekday initial |
| Weeks | one week, Monday start | month and year | date the week begins |
| Months | one month | none | month name, then the year where a year begins |
| Quarters | three months | none | Q1 to Q4, then the year where a year begins |

Both header lines are always present, even when the second is empty, so the rule
under the header stays unbroken whatever the scale.

At day scale, Saturdays and Sundays are greyed in the header and tinted down the
full height of the chart, since courts do not sit then. Consecutive weekend days
are merged into one element, so a run of 543 days costs 77 of them rather than
155.

### Progress and status

Every card carries a progress bar. Its length is completion across all five
stages, weighted so build counts for more than scoping: scoping 10, design and
development 40, internal testing 20, user testing 20, deployment 10. Halfway
through build therefore reads as 30%, not 50%.

Its colour is one of four states, worked out from the data at render time:

| Colour | State | Rule |
| --- | --- | --- |
| Gray, empty | Not started | no progress yet, or the start date is still ahead |
| Blue | In progress | everything else |
| Red | Blocked | `risk` is `blocked` |
| Green | Completed | deployed, with `stageProgress` at 100 |

Completed wins over blocked, and blocked wins over not started. A legend above
the board explains the colours, and the label beside each bar spells out the
state, so colour is never the only signal.

### Not shown yet

The data also carries the first committed date, the watch and delayed flags,
and the full stage history. The validator enforces all of it, and none of it is
on the page yet.

## Layout

```
public/              everything Netlify serves
  index.html
  styles.css
  favicon.svg
  app/               ES modules, no build step, no dependencies
    main.js          hash routing between gate, board, timeline and profiles
    auth.js          access code check (PBKDF2 via WebCrypto)
    store.js         fetches the JSON
    people.js        person lookup, monograms, who works on what
    format.js        dates and month arithmetic for the timeline
    theme.js         light and dark
    html.js          escaping template helper
    views/
      gate.js        the access code screen
      chrome.js      shared top bar, avatars, face stacks
      dashboard.js   the stage board
      sheet.js       the detail dialog, for a workstream or a set of people
      profile.js     one person and everything they are named on
      timeline.js    the filterable gantt
  data/              the only files the scheduled update touches
    config.json      stages, risk flags, state registry
    access.json      KDF settings and access code verifiers
    people.json      one canonical record per person
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
- A workstream sits in exactly one stage at a time.
- People are referenced by id from `people.json`, so one person has one record
  and one role no matter how many courts they appear in.
- Nobody has a photograph yet, so profiles show a monogram. `people.json` takes a
  `photo` path when real ones arrive.
- Files are listed by name and type with no link yet, because the documents live
  outside this repository. The `href` field is ready for them.
- Workstream content, people and dates are illustrative, structured to match how
  the programme actually reports, but not drawn from live plans.
- `baseline` is the first committed target date. The gap between `baseline` and
  `target` is what the dashboard calls a delay.
- A court sees only its own state, and the programme office sees all four.
- The gate is a soft gate. See [docs/SECURITY.md](docs/SECURITY.md).
