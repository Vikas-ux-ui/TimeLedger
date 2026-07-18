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
| Working day, inside shift, ≥ 4.5 hours left | `Online` |
| Working day, inside shift, 0 < hours left < 4.5 | `Limited Time` |
| Working day, before shift, starts within 2 hours | `Starts Soon` |
| Working day, before shift, more than 2 hours away | `Offline` |
| At or after shift end | `Offline` |
| Not a configured workday | `Non-Working Day` |
| Time zone or working hours missing/invalid | `Schedule Unavailable` |

Hours left never goes negative. Before a shift opens, hours left represents the full
upcoming shift duration — which is why a member can show a large hours-left value and
still not be deployment eligible: eligibility additionally requires that they are
*currently* inside working hours.

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

## Production deployment rules

- **Minimum timeline: 4.5 hours.** A member is deployment eligible when they are
  currently within working hours *and* have at least 4.5 hours of scheduled time left.
  Rows show `Deployment window OK` or `Insufficient deployment window` accordingly.
- **Preferred communication cutoff: 4:00 PM KSA.** After this time a page-level advisory
  appears. It is guidance only — it never hides data or blocks any action.

Both values live in `src/config/settings.ts` and can be changed in one place.

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
  services/         teamAvailabilityService  (data access boundary)
  config/           settings  (all business configuration)
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
status rules at every boundary, deployment eligibility either side of 4.5 hours,
schedule validation, search, combined filters, reset, pagination, and the 4:00 PM
advisory. Component tests drive the real 36-record dataset through the assembled page
with a frozen clock.

```bash
npm run test
```
