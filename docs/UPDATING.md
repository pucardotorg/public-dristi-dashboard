# Updating the status

Everything a reader sees comes from four files:

```
public/data/punjab.json
public/data/haryana.json
public/data/kerala.json
public/data/gujarat.json
```

Nothing else needs to change to publish an update. No code, no rebuild.

## The procedure

1. Gather the current position for each workstream: stage, rough progress within
   that stage, owner, target date, and whether the date has moved.
2. Edit the state file. Keep the field shape below.
3. `npm run stamp -- <slug>` on each state that changed, or `all`.
4. `npm run validate`. Fix anything it reports. Do not publish with errors.
5. Commit and push. Netlify runs the validator again as its build command and
   deploys `public/`.

## Field shape

```jsonc
{
  "slug": "punjab",                 // must match the file name and config.json
  "name": "Punjab",
  "court": "Punjab & Haryana High Court",
  "updated": "2026-09-22",          // set by npm run stamp
  "rollout": {
    "courtsLive": 6,                // cannot exceed courtsPlanned
    "courtsPlanned": 24,
    "note": "One or two sentences a judge would find useful."
  },
  "leads": [{ "name": "...", "role": "...", "org": "..." }],
  "workstreams": [
    {
      "id": "pb-efiling",           // stable, never reused, never renamed
      "name": "e-Filing and scrutiny",
      "summary": "One sentence in plain language, no jargon.",
      "stage": "user-testing",      // an id from config.json stages
      "stageProgress": 45,          // 0 to 100, progress WITHIN the stage
      "risk": "on-track",           // on-track | watch | delayed | blocked
      "owner": { "name": "...", "role": "...", "org": "..." },
      "team": [{ "name": "...", "role": "..." }],
      "target": "2026-11-14",       // current expected deployment date
      "baseline": "2026-11-14",     // the FIRST committed date, do not edit later
      "liveSince": null,            // set only once deployed, otherwise omit
      "history": [
        { "stage": "scoping", "from": "2026-01-06", "to": "2026-02-20" },
        { "stage": "design-dev", "from": "2026-02-23", "to": "2026-07-10" },
        { "stage": "internal-testing", "from": "2026-07-13", "to": "2026-08-28" },
        { "stage": "user-testing", "from": "2026-09-01", "to": null }
      ],
      "note": "What is actually happening, and why a date moved if it did."
    }
  ]
}
```

## Rules the validator enforces

- Every date is `YYYY-MM-DD`. `updated` cannot be in the future.
- `stage` and `risk` must be ids that exist in `config.json`.
- `stageProgress` is a number from 0 to 100.
- Every workstream has an owner with a name and a role, and a non empty `note`.
- Ids are unique within a state.
- `history` covers every stage up to and including the current one, and no stage
  after it. Finished stages need a `to` date, the current stage does not have one.
- **A moved date must be flagged.** If `target` is later than `baseline`, `risk`
  has to be `delayed` or `blocked`. If `risk` is `delayed`, the date must actually
  have moved. This keeps the dashboard from quietly hiding a slip.
- A deployed workstream (`stage: "deployment"`, `stageProgress: 100`) is marked
  `on-track` and carries a `liveSince` date that is not in the future.

## Moving a workstream forward a stage

1. Close the current `history` entry with a `to` date.
2. Append the next stage with a `from` date.
3. Set `stage` to the new stage and reset `stageProgress` to a fraction of it.

## Recording a delay

1. Leave `baseline` alone. It is the record of what was first promised.
2. Move `target` to the new date.
3. Set `risk` to `delayed`, or `blocked` when the cause sits outside the team.
4. Say why in `note`, in one sentence, in the language a judge would use.

The dashboard works out the slip in days and shows it as a badge. There is no
field to edit for that.

## Adding a workstream

Append to `workstreams` with a new id, `stage: "scoping"`, `history` holding just
the scoping entry, and `baseline` equal to `target`. Nothing else to register.

## Adding a state

1. Add it to `states` in `config.json`.
2. Create `public/data/<slug>.json`.
3. `npm run access-code -- "XX-COURT-2026"` and add a grant in `access.json`.
4. Add the new slug to the programme office grant's `states`.
