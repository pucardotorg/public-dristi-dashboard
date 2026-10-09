# Updating the status

Everything a reader sees comes from five files:

```
public/data/people.json     one record per person
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
  "leads": ["ritu-malhotra", "justice-a-s-grewal"],   // ids from people.json
  "workstreams": [
    {
      "id": "pb-efiling",           // stable, never reused, never renamed
      "name": "e-Filing and scrutiny",
      "summary": "One sentence in plain language, no jargon.",
      "stage": "user-testing",      // an id from config.json stages
      "stageProgress": 45,          // 0 to 100, progress WITHIN the stage
      "risk": "on-track",           // on-track | watch | delayed | blocked
      "owner": "ritu-malhotra",     // one id from people.json
      "team": ["karan-ahluwalia", "meera-joshi"],     // ids, never the owner
      "target": "2026-11-14",       // the deadline shown on the card
      "baseline": "2026-11-14",     // the FIRST committed date, do not edit later
      "liveSince": null,            // set only once deployed, otherwise omit
      "history": [
        { "stage": "scoping", "from": "2026-01-06", "to": "2026-02-20" },
        { "stage": "design-dev", "from": "2026-02-23", "to": "2026-07-10" },
        { "stage": "internal-testing", "from": "2026-07-13", "to": "2026-08-28" },
        { "stage": "user-testing", "from": "2026-09-01", "to": null }
      ],
      "files": [
        {
          "name": "User testing script",
          "type": "sheet",          // pdf | doc | sheet | link
          "updated": "2026-09-01",
          "href": null              // null, or an https URL
        }
      ],
      "note": "What is actually happening, and why a date moved if it did."
    }
  ]
}
```

`people.json` holds one record per person, referenced by id from every state
file:

```jsonc
{
  "people": [
    {
      "id": "ritu-malhotra",        // lower case, hyphenated, stable forever
      "name": "Ritu Malhotra",
      "role": "Programme lead",     // their job title, not their task
      "org": "Agami",
      "based": "Chandigarh",
      "photo": null                 // null, an https URL, or photos/<file>
    }
  ]
}
```

## Rules the validator enforces

- Every date is `YYYY-MM-DD`. `updated` cannot be in the future.
- `stage` and `risk` must be ids that exist in `config.json`.
- `stageProgress` is a number from 0 to 100.
- Every workstream has a non empty `note`.
- `owner` and every `team` id exist in `people.json`. The owner is not repeated
  in the team, and the team does not repeat anyone.
- `files` is an array, empty if nothing is attached. Each file has a name, a type
  from the list above, an `updated` date, and `href` either null or an https URL.
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

## What drives the bar colour

- Set `risk` to `blocked` and the card's bar turns red.
- A deployed workstream (`stage: "deployment"`, `stageProgress: 100`) turns green.
- A planned workstream that has not begun stays gray: put it in `scoping` with
  `stageProgress: 0` and a `from` date in the future.
- Everything else is blue, and the bar's length follows `stage` and
  `stageProgress`.

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

## Adding a person

1. Add a record to `people.json` with a new id, their name, job title and
   organisation. `photo` stays null until a real photograph exists.
2. Reference the id from `owner` or `team`. Their profile page appears on its own
   at `#/person/<id>`, listing everything they are named on.

Never delete a person who is still referenced. The validator will catch it.

## Adding a state

1. Add it to `states` in `config.json`.
2. Create `public/data/<slug>.json`.
3. `npm run access-code -- "XX-COURT-2026"` and add a grant in `access.json`.
4. Add the new slug to the programme office grant's `states`.
