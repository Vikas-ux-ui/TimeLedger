# Agility Insights — Global Team Availability

A business-facing dashboard that shows when globally distributed team members are
**scheduled** to be working, how much scheduled time remains before their local end of
day, and whether there is enough of a window left to raise a production deployment.

Every time is shown twice: in the team member's own local time, and in Saudi Arabia
time (`Asia/Riyadh`).

---

## Prerequisites

- **Node.js 20.19+ or 22.12+** (Vite 8 requirement — this project was built on Node 22.12)
- **npm 10+**

## Commands

```bash
npm install      # install dependencies
npm run dev      # start the dev server on http://localhost:5173
npm run test     # run the unit and component test suite once
npm run build    # type-check and produce a production build in dist/
```

Additional scripts:

```bash
npm run test:watch     # re-run tests on change
npm run test:coverage  # tests with a V8 coverage report
npm run typecheck      # TypeScript only, no bundle
npm run lint           # oxlint
npm run preview        # serve the production build locally
```

---

## What the status actually means

**This application displays scheduled availability, not attendance.**

`Online` means *"the current time falls inside this person's configured working
hours"*. It is **not** derived from login, logout, presence, calendar activity, or any
authentication signal, and the UI never claims otherwise. If a real attendance or
presence API is added later, that data should be surfaced as a separate, clearly
labelled signal rather than folded into this one.

Status is derived as follows:

| Condition | Status |
|---|---|
| Working day, inside shift, ≥ 5 hours left | `Online` |
| Working day, inside shift, 0 < hours left < 5 | `Limited Time` |
| Working day, before shift, starts within 2 hours | `Starts Soon` |
| Working day, before shift, more than 2 hours away | `Offline` |
| At or after shift end | `Offline` |
| Not a configured workday | `Non-Working Day` |
| Time zone or working hours missing/invalid | `Schedule Unavailable` |

Hours left never goes negative. Before a shift opens, hours left represents the full
upcoming shift duration — which is why a member can show a large hours-left value and
still not be deployment eligible: eligibility additionally requires that they are
*currently* inside working hours.

> The 5-hour minimum is a business setting, not a constant baked into the logic. See
> [Configuration](#configuration) below — it is read from the JSON config file and
> drives the status thresholds, the eligibility rule, the row tooltips, the filter
> shortcut, and the timeline card from that one value.

---

## The time-zone approach

**All calculations use IANA time-zone identifiers. No UTC offset is hardcoded anywhere.**

This matters because several locations in the dataset observe daylight saving time
(`America/Chicago`, `America/Los_Angeles`) while others never do (`Asia/Kolkata`,
`Asia/Karachi`, `Asia/Riyadh`). A fixed offset would silently drift by an hour twice a
year; the IANA database handles the transitions.

[Luxon](https://moment.github.io/luxon/) resolves local wall-clock times to real
instants. The calculation for each member is:

1. Express the shared `now` in the member's own zone.
2. Build today's shift start and end as wall-clock times **in that zone** — so `09:00`
   means 9am where they are, whatever the offset happens to be that day.
3. Re-express those same two instants in `Asia/Riyadh` for the *Working Hours in KSA*
   column. This is a **converted range** (e.g. `6:30 AM – 8:30 PM KSA`), never an
   elapsed duration. When a converted shift lands on the next calendar day in KSA, the
   range is annotated `(+1d)`.
4. Compare `now` against those instants to derive hours left and status.

Zones in use:

| Location | IANA zone |
|---|---|
| KSA | `Asia/Riyadh` |
| India | `Asia/Kolkata` |
| Pakistan | `Asia/Karachi` |
| Omaha | `America/Chicago` |
| California | `America/Los_Angeles` |
| Colombia | `America/Bogota` |
| Azerbaijan | `Asia/Baku` |

### The shared clock

One `now` value drives the entire page — the header clock, every row, and the cutoff
advisory — refreshed every 30 seconds by a single interval that is cleared on unmount.
No row owns a timer, so all rows are always consistent with one another. `now` is
injected into every calculation rather than read from the system clock inside it, which
is what makes the test suite deterministic.

### Viewer time zone

The viewer's zone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`. This is
synchronous and never blocks rendering. Geolocation is **not** requested: a zone is
sufficient for the times shown here, and a denied permission prompt must never degrade
the page. A time zone cannot identify a city or country on its own, so the UI says
"Viewing in *Kolkata* time" rather than asserting where you are. A manual override
selector is provided.

---

## Data

The prototype loads `src/data/team-availability-seed-data.json` — **36 team-membership
records across 6 teams** (Fastlane 4, Guardians 3, Insight Pioneers 7,
Skynet & Cassata 7, UI/UX 3, Warriors 12), derived from Sheet2 of
`Team Capabilites & Team Members list.xlsx`.

Transformations applied to the source sheet:

- Location strings (`India (IST)`, `Omaha (CST)`, …) mapped to IANA zones. The offsets in
  the source labels are informational only and are not used in any calculation.
- The `(shared)` marker moved from the name text into an `isShared` flag.
- `Techlead` normalised to `Tech Lead` — the source spells one role two ways, which would
  otherwise produce two entries in the Role filter. No other role text is altered.
- Everyone gets the prototype default schedule: **09:00–23:00 local, Monday–Friday**.

**All 36 membership records are preserved.** A person on multiple teams appears once per
team and is marked `Shared`. People are never merged by name, and differing email
addresses are never merged without an explicit identity mapping — in a production
integration this becomes a stable `EmployeeId` with a many-to-many team membership model.

### Swapping in a real API

`src/services/teamAvailabilityService.ts` is the only file that knows where data comes
from. It already returns a Promise, so replacing the JSON import with a `fetch` call to
`GET /api/team-availability` requires no changes to any hook or component.

---

## Configuration

Business settings live in the `settings` block of
`src/data/team-availability-seed-data.json`:

```json
"settings": {
  "ksaTimeZone": "Asia/Riyadh",
  "productionDeploymentMinimumHours": 5,
  "productionCommunicationCutoffKsa": "16:00",
  "defaultWorkStartLocal": "09:00",
  "defaultWorkEndLocal": "23:00"
}
```

Editing a value there changes the application's behaviour — no code change is needed.
Changing `productionDeploymentMinimumHours` to `4.5` or `6` moves the deployment
eligibility rule, the Online/Limited status boundary, the row tooltips, the
"minimum hours left" filter shortcut, and the timeline card together.

**How it resolves.** `src/config/settings.ts` reads the block through the existing
data boundary (`getSeedSettings()`), validates each field, and merges it over
`DEFAULT_SETTINGS`. Everything else in the app reads the resulting `APP_SETTINGS`,
so there is exactly one place a value enters the system.

**Validation.** Each field is checked before use, and an invalid entry falls back to
its default with a `console.warn` rather than throwing — one bad value degrades one
setting, it never breaks the page.

| Field | Accepted |
|---|---|
| `productionDeploymentMinimumHours` | finite number, `0`–`24` (a minimum longer than any shift would make everyone permanently ineligible) |
| `productionCommunicationCutoffKsa` | `HH:mm`, 24-hour |
| `defaultWorkStartLocal` / `defaultWorkEndLocal` | `HH:mm`, 24-hour |
| `ksaTimeZone` | an IANA id this runtime resolves |

**Backward compatibility.** Every field is optional. A config with a partial
`settings` block, or none at all, still loads — each missing value falls back to its
default. Branding fields (`applicationName`, colours, font) stay code-owned and are
not read from the file.

---

## Availability Summary

A panel between the filters and the table answers one question: **if a deployment
started now and needed the configured minimum hours, who would still be working when
it finished?**

It shows the current KSA time, the minimum window, the expected completion instant in
KSA, and a card per available member with their local time now, their logout time, the
completion instant *converted into their own zone*, and how much of their day is left.
When nobody qualifies it says so rather than showing an empty list.

### How availability is decided

```text
expectedCompletion = now + productionDeploymentMinimumHours
available          = member is on shift now  AND  shift ends at or after expectedCompletion
```

That second condition is already what the table's per-row deployment indicator
computes, so the panel reuses it rather than deriving it a second time:

```text
hoursLeft >= minimumHours
  <=> shiftEnd - now >= minimumHours
  <=> shiftEnd       >= now + minimumHours
  <=> shiftEnd       >= expectedCompletion
```

The two are the same statement, so `deploymentEligible` is the single source. Computing
it twice would let the panel and the table disagree.

Excluded, therefore: anyone whose day has already ended, anyone whose day ends before
completion, anyone not yet started, and anyone on a non-working day.

> Members whose shift has not opened yet are **not** listed, even if their day would
> run past the completion time. The panel answers "who can I hand this to right now",
> and someone who has not started cannot take it. This matches the per-row indicator.

### What refreshes it

The panel derives everything from the filtered entries, the shared clock and the
resolved configuration, so it re-computes on its own when the Team, Role, Location,
search or advanced filters change, when a logout time is edited, and when the clock
ticks. It reflects **all** filtered members, not just the visible page.

Changing `productionDeploymentMinimumHours` in the JSON needs a reload, because the
configuration is resolved once at module load (see [Configuration](#configuration)).

---

## Editing a logout time

The **Logout Time** column is editable. It is the member's scheduled end of day in
their own time zone — the same value as `workSchedule.endLocal`, surfaced directly
rather than duplicated, so there is only ever one answer to "when does this person
stop working".

Changing it recalculates that row live: Local Working Hours, Working Hours in KSA,
Hours Left, Status and deployment eligibility all follow from the new end time.

The field commits on blur or <kbd>Enter</kbd>, and <kbd>Esc</kbd> cancels. A native
`time` input is used so the browser supplies a real picker and keyboard support; the
12-hour caption underneath states the value unambiguously, because the control itself
renders 12- or 24-hour depending on the viewer's locale.

**Where the edit goes.** In development a Vite middleware
(`vite/seedDataApiPlugin.ts`) exposes `PATCH /api/team-members/:id` and writes the
change straight into `src/data/team-availability-seed-data.json` — the file on disk
really does change. A production build has no such server, so the client falls back
to a `localStorage` overlay that is applied over the seed file on load. Either way the
edit survives a refresh.

The table updates optimistically and rolls the row back if the save is refused, so a
value that was not stored is never left on screen.

> The seed file is excluded from Vite's watcher (see `vite.config.ts`). Writing it
> would otherwise trigger a full page reload on every edit and discard the user's
> filters and page position. The trade-off is that hand-editing that file during
> development needs a manual refresh.

---

## Production deployment rules

- **Minimum timeline: 5 hours.** A member is deployment eligible when they are
  currently within working hours *and* have at least 5 hours of scheduled time left.
  Rows show `Deployment window OK` or `Insufficient deployment window` accordingly.
- **Preferred communication cutoff: 4:00 PM KSA.** After this time a page-level advisory
  appears. It is guidance only — it never hides data or blocks any action.

Both values are configurable — see [Configuration](#configuration).

---

## Project structure

```text
src/
  components/       AppHeader, ViewerLocation, SearchFilters, TeamAvailabilityTable,
                    TeamMemberRow, StatusBadge, Pagination, DeploymentCards,
                    CutoffWarning, EmptyState, ErrorState, icons
  hooks/            useCurrentTime, useViewerTimeZone, useTeamFilters, useTeamMembers
  utils/            timeZoneUtils, availabilityUtils, filterUtils, formatUtils
  types/            teamMember, availability
  services/         teamAvailabilityService  (data + config access boundary)
  config/           settings  (defaults, validation, resolved APP_SETTINGS)
  data/             team-availability-seed-data.json
  styles/           tokens.css
  test/             setup, factories
```

---

## Accessibility

- Semantic `header` / `main` / `section` / `table` / `footer` structure.
- Every form control has a visible or screen-reader label.
- Sortable columns are real buttons and carry `aria-sort`.
- The result count is a polite live region, so filtering is announced without stealing
  focus.
- Status is always conveyed by text; colour and the status dot are reinforcement only.
- Table rows are keyboard focusable with a visible focus ring.
- Decorative icons are `aria-hidden`; durations carry a spelled-out screen-reader form
  (`8 hours 30 minutes` alongside `8h 30m`).
- Honours `prefers-reduced-motion`.

## Responsive behaviour

- **Desktop** — full table, filters on one row, deployment cards side by side.
- **Tablet** — table scrolls horizontally with the Team Member column pinned.
- **Mobile** — each row becomes a card with per-cell labels, filters stack, deployment
  cards stack.

## Testing

69 tests across 4 files, covering time-zone formatting, KSA conversion, hours-left and
status rules at every boundary, deployment eligibility either side of the
configured minimum,
schedule validation, search, combined filters, reset, pagination, and the 4:00 PM
advisory. Component tests drive the real 36-record dataset through the assembled page
with a frozen clock.

```bash
npm run test
```
