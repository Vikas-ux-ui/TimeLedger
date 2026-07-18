# Agility Insights — Global Team Availability
## Product and Technical Requirements for a React + TypeScript Prototype

**Document purpose:** Provide Claude with a complete, implementation-ready specification for building the Global Team Availability application.

**Primary users:** Business Owners, Product Owners, Project Managers, Delivery Managers, and other business stakeholders coordinating with globally distributed employees.

**Source team data:** `Team Capabilites & Team Members list.xlsx`, Sheet2. A cleaned prototype dataset is provided separately in `team-availability-seed-data.json`.

**Prototype data summary:** 36 team-membership records across 6 teams. Fastlane: 4, Guardians: 3, Insight Pioneers: 7, Skynet & Cassata: 7, UI/UX: 3, Warriors: 12.

---

## 1. Product Vision

Create a business-facing application that helps a Business Owner understand when globally distributed team members are working and how much working time remains before their scheduled end of day.

The application must make it easy to decide whether there is enough time to:

- contact a team member;
- discuss a new feature;
- request a production fix;
- coordinate an urgent deployment;
- avoid contacting or burdening employees outside their local working hours.

The application must show all time information in both the employee's local time and Saudi Arabia time.

---

## 2. Important Business Interpretation

This application displays an employee's **scheduled availability and scheduled end-of-day time**.

It must not claim that it knows the employee's actual login, logout, attendance, presence, or activity unless a future backend attendance or presence API supplies that information.

For the prototype:

- every employee has a default schedule of **9:00 AM to 11:00 PM in their local time zone**;
- 11:00 PM is the default scheduled log-off time;
- an employee-specific schedule may override the default;
- all time-zone calculations must use IANA time-zone identifiers;
- no time-zone offsets may be hardcoded.

---

## 3. Branding and Visual Design

### 3.1 Brand

- Brand name: **Agility Insights**
- Page title: **Global Team Availability**
- Subtitle: **Find the right time to connect**
- Do not use the Goldman Sachs name, logo, or assets.
- The layout may be inspired by the clean structure of the supplied reference, but must remain an Agility Insights product.

### 3.2 Required style

| Element | Requirement |
|---|---|
| Primary header color | `#7296C4` |
| Table header background | `#E2E2E5` |
| Table header text | Black |
| Primary font | `"Times New Roman", Times, serif` |
| Page background | White or very light neutral gray |
| Borders | Thin, light gray |
| Main text | Black or near-black |
| Header text | White |
| Overall style | Professional, spacious, business-oriented, and clean |

### 3.3 Status colors

- Online / sufficient time: green
- Limited time: amber or orange
- Offline / not working: gray
- Insufficient production-deployment window: red
- Status must never be conveyed by color alone; include readable text and icons.

---

## 4. Main Page Layout

Build a single-page dashboard with the following sections.

### 4.1 Primary header

The full-width header must contain:

1. **Agility Insights** brand name on the left.
2. A vertical separator.
3. Page title: **Global Team Availability**.
4. Subtitle: **Find the right time to connect**.
5. A KSA time card on the right:
   - label: `KSA Current Time`;
   - live time;
   - current KSA date;
   - time zone: `Asia/Riyadh`.
6. Business Owner avatar with initials `BO`.
7. User label: `Business Owner`.
8. Optional dropdown chevron for future account actions.

The KSA clock must update automatically at least once every minute.

### 4.2 Current viewer location

The application must also detect the current viewer's time zone.

Display a small line below the header or inside a tooltip, such as:

`Viewing from India — Asia/Kolkata — 1:30 PM`

Rules:

- First use `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Exact city/country detection must not be assumed from the time zone alone.
- The app may optionally request browser geolocation permission.
- If permission is denied, continue using the browser time zone.
- Provide a manual time-zone selector or override.
- Do not continuously track the user's location.
- Do not block the page when location permission is denied.

### 4.3 Search and filter section

Place a wide search/filter panel below the header.

Required controls:

1. Search input
   - placeholder: `Search by name, team, role, location or keyword...`
   - searches team-member name, team, role, location, and email;
   - case-insensitive;
   - trims spaces;
   - supports partial matches.

2. Team dropdown
   - default: `All Teams`;
   - options generated from the dataset.

3. Role dropdown
   - default: `All Roles`;
   - options generated from the dataset.

4. Location dropdown
   - default: `All Locations`;
   - options generated from the dataset.

5. More Filters button
   - may open a popover or side panel;
   - include:
     - status;
     - minimum hours left;
     - available for production deployment;
     - currently within working hours;
     - shared team member only.

6. Reset button
   - clears search, filters, sorting, and pagination;
   - restores default values.

Filtering must happen immediately without a full-page reload.

---

## 5. Team Availability Table

### 5.1 Table summary controls

Above the table show:

- `Showing X of Y team members`;
- sorting control on the right;
- default sort: `KSA Time — Soonest Available` or, preferably, employees currently working with the greatest useful overlap first.

Recommended sort options:

- Name A–Z
- Team A–Z
- Location A–Z
- Hours left — highest first
- Hours left — lowest first
- Local end time — earliest first
- Currently available first
- Production deployment eligible first

### 5.2 Required columns

| Column | Required content |
|---|---|
| Team Member | Initials/avatar, full name, and role below the name |
| Team | Team name; shared users may display a `Shared` label |
| Location | Location label and optional country flag |
| Local Time | Current time and date in the employee's IANA time zone |
| Local Working Hours | Start and end time in the employee's local time |
| KSA Current Time | Current Saudi Arabia time; same instant for every row |
| Working Hours in KSA | Employee's complete local shift converted into Saudi Arabia time |
| Hours Left for the Day | Remaining scheduled working time, readable duration, optional progress indicator |
| Status | Online, Starts Soon, Limited Time, Offline, Non-Working Day, or Schedule Unavailable |
| Actions | Three-dot menu placeholder for future actions |

**Important correction:** `Working Hours in KSA` must display a converted time range, for example `6:30 AM–8:30 PM KSA`. It must not display elapsed time.

### 5.3 Row behavior

- Use alternating white/light backgrounds only if subtle.
- Rows must be keyboard navigable.
- Hover and focus state should be visible.
- Long roles and locations must wrap or show an accessible tooltip.
- Shared team members must be clearly marked.
- A person may belong to more than one team.

Prototype handling of duplicate/shared rows:

- Preserve all provided team-membership records.
- In a production integration, use a stable `EmployeeId` and a many-to-many team membership model.
- Do not merge people solely by matching names.
- Do not automatically merge different email addresses without an explicit identity mapping.

### 5.4 Pagination

Required:

- rows-per-page dropdown: 10, 20, 50;
- previous and next buttons;
- numbered pages;
- text such as `1–10 of 36`;
- changing filters returns the table to page 1.

---

## 6. Time and Availability Rules

### 6.1 Required time zones

- KSA: `Asia/Riyadh`
- India: `Asia/Kolkata`
- Pakistan: `Asia/Karachi`
- Omaha: `America/Chicago`
- California: `America/Los_Angeles`
- Colombia: `America/Bogota`
- Azerbaijan: `Asia/Baku`

Use IANA time zones so daylight-saving changes are handled correctly.

### 6.2 Employee schedule

Each team member has:

- `startLocal`;
- `endLocal`;
- `workDays`;
- `timeZone`.

Prototype default:

- start: `09:00`;
- end: `23:00`;
- workdays: Monday through Friday.

### 6.3 Calculations

For a selected current instant `now`:

1. Determine the employee's local date and time.
2. Build today's shift start and end in the employee's time zone.
3. Convert the same shift instants into `Asia/Riyadh`.
4. Calculate remaining scheduled time.

#### Hours-left rule

- Before shift start:
  - status: `Starts Soon` or `Offline`;
  - show `Starts in X`;
  - hours left should represent the full upcoming shift duration.
- During shift:
  - `hoursLeft = shiftEnd - now`.
- At or after shift end:
  - hours left = `0`;
  - status: `Offline`.
- On a non-working day:
  - hours left = `0`;
  - status: `Non-Working Day`.
- Never show a negative value in `Hours Left for the Day`.
- If an overnight schedule is added later and end time is earlier than or equal to start time, treat the end as the following calendar day.

### 6.4 Status rules

Recommended status derivation:

| Condition | Status |
|---|---|
| Working day and now is within shift, hours left >= 4.5 | Online |
| Working day and now is within shift, 0 < hours left < 4.5 | Limited Time |
| Working day and now is before shift, begins within 2 hours | Starts Soon |
| Working day and now is before shift by more than 2 hours | Offline |
| Now is at or after shift end | Offline |
| Today is not a configured workday | Non-Working Day |
| Schedule/time zone is missing or invalid | Schedule Unavailable |

Do not infer online presence from browser or authentication activity. `Online` in this prototype means **currently inside scheduled working hours**.

---

## 7. Production Deployment Rules

At the bottom of the page, display two prominent cards.

### 7.1 Production Deployment Minimum Timeline card

Required content:

- heading: `Production Deployment Minimum Timeline`;
- value: `4.5 hours`;
- explanation: `Minimum notice required before production deployment.`;
- clock icon;
- light blue background;
- blue heading and icon.

### 7.2 Production communication note

Required copy:

> For any communication related to the production timeline, production fix, or urgent deployment, please communicate before 4:00 PM KSA. This helps the team plan and provide effective support.

Requirements:

- emphasize `please communicate before 4:00 PM KSA`;
- use a light cream or warning background;
- display an information icon;
- remain visible below the table.

### 7.3 Deployment eligibility

For each team member calculate:

`deploymentEligible = currentlyWithinWorkingHours AND hoursLeft >= 4.5`

UI behavior:

- show a tooltip or small indicator when the employee has at least 4.5 working hours left;
- show `Insufficient deployment window` when less than 4.5 hours remain;
- after 4:00 PM KSA, show a page-level warning that the preferred communication cutoff has passed;
- the 4:00 PM cutoff is advisory and must not hide data or block the user.

---

## 8. Responsive Behavior

### Desktop

- full table with all columns;
- search and filters on one horizontal row where space allows;
- deployment cards displayed side by side.

### Tablet

- filters may wrap to two rows;
- table must allow horizontal scrolling;
- sticky first column is recommended.

### Mobile

- header items stack cleanly;
- KSA time remains prominent;
- filters become a vertical form or filter drawer;
- each employee may render as a card instead of a wide table;
- deployment cards stack vertically;
- no text may overlap or be cut off.

---

## 9. Accessibility

- Meet WCAG 2.1 AA where practical.
- Use semantic HTML: `header`, `main`, `section`, `table`, `thead`, `tbody`, and `button`.
- Every form field must have a visible label or accessible name.
- Keyboard users must be able to reach all interactive controls.
- Focus state must be visible.
- Icons must have accessible labels or be hidden from screen readers when decorative.
- Color contrast must be sufficient.
- Status must include text, not color alone.
- Use `aria-sort` for sortable columns.
- Use a polite live region when the filtered-result count changes.

---

## 10. React and TypeScript Implementation Requirements

### 10.1 Technology

Build with:

- React;
- TypeScript in strict mode;
- Vite;
- functional components;
- React hooks;
- CSS Modules, plain CSS, or a similarly maintainable styling approach;
- native `Intl.DateTimeFormat` for display;
- a reliable time-zone utility such as `date-fns-tz` or Luxon for converting local schedule boundaries to instants.

Do not hardcode UTC offsets.

### 10.2 Suggested project structure

```text
src/
  components/
    AppHeader/
    ViewerLocation/
    SearchFilters/
    TeamAvailabilityTable/
    TeamMemberRow/
    StatusBadge/
    DeploymentTimelineCard/
    ProductionCommunicationNote/
    Pagination/
    EmptyState/
    ErrorState/
  hooks/
    useCurrentTime.ts
    useViewerTimeZone.ts
    useTeamFilters.ts
  utils/
    timeZoneUtils.ts
    availabilityUtils.ts
    filterUtils.ts
    formatUtils.ts
  types/
    teamMember.ts
    availability.ts
  data/
    team-availability-seed-data.json
  styles/
    tokens.css
  App.tsx
  main.tsx
```

### 10.3 TypeScript data model

```ts
export type WorkSchedule = {
  startLocal: string; // HH:mm
  endLocal: string;   // HH:mm
  workDays: number[]; // ISO day: Monday=1 ... Sunday=7
};

export type TeamMember = {
  id: string;
  sourceSequence?: number;
  name: string;
  email?: string;
  team: string;
  role: string;
  locationLabel: string;
  timeZone: string;
  isShared?: boolean;
  workSchedule: WorkSchedule;
};

export type AvailabilityStatus =
  | "online"
  | "limited"
  | "starts-soon"
  | "offline"
  | "non-working-day"
  | "schedule-unavailable";

export type CalculatedAvailability = {
  localCurrentDateTime: Date;
  localWorkStart: Date | null;
  localWorkEnd: Date | null;
  ksaWorkStart: Date | null;
  ksaWorkEnd: Date | null;
  hoursLeft: number;
  startsInHours: number | null;
  isWithinWorkingHours: boolean;
  deploymentEligible: boolean;
  status: AvailabilityStatus;
};
```

### 10.4 Application settings

Create a single configuration object:

```ts
export const APP_SETTINGS = {
  applicationName: "Agility Insights",
  pageTitle: "Global Team Availability",
  pageSubtitle: "Find the right time to connect",
  ksaTimeZone: "Asia/Riyadh",
  productionDeploymentMinimumHours: 4.5,
  productionCommunicationCutoffKsa: "16:00",
  defaultWorkStartLocal: "09:00",
  defaultWorkEndLocal: "23:00",
  primaryHeaderColor: "#7296C4",
  tableHeaderColor: "#E2E2E5",
  fontFamily: '"Times New Roman", Times, serif',
} as const;
```

### 10.5 State

The page state should include:

- search text;
- selected teams;
- selected roles;
- selected locations;
- selected statuses;
- minimum hours left;
- deployment eligible only;
- shared only;
- sort field and direction;
- current page;
- rows per page;
- viewer time-zone override;
- current clock instant.

Use memoized derived data for filtering, sorting, availability calculations, and pagination.

### 10.6 Clock behavior

- Maintain one shared `now` value for the complete page.
- Update it every 30 or 60 seconds.
- Clear the interval when the component unmounts.
- Do not create a separate timer for every row.

---

## 11. Prototype Data

Use the attached `team-availability-seed-data.json`.

The data contains:

- employee/team-membership rows from the uploaded spreadsheet;
- IANA time zones mapped from the supplied locations;
- default working hours of 9:00 AM–11:00 PM local time;
- shared-member flags;
- production timeline configuration;
- visual design tokens.

The prototype should load the JSON locally.

---

## 12. Future API Contract

The prototype can use local JSON, but structure the code so it can later consume an API.

### GET `/api/team-availability`

Suggested query parameters:

```text
search
team
role
location
status
minimumHoursLeft
deploymentEligible
sharedOnly
sort
page
pageSize
```

Suggested response:

```json
{
  "generatedAtUtc": "2026-07-18T08:00:00Z",
  "settings": {
    "ksaTimeZone": "Asia/Riyadh",
    "productionDeploymentMinimumHours": 4.5,
    "productionCommunicationCutoffKsa": "16:00"
  },
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 36,
    "totalPages": 4
  }
}
```

A future production system should preferably return stable employee IDs, team memberships, schedules, approved location labels, and IANA time zones.

---

## 13. Loading, Empty, and Error States

### Loading

- show table skeletons;
- keep header visible;
- do not show fake calculated values before data is ready.

### Empty state

Message:

`No team members match the selected filters.`

Provide a `Reset filters` button.

### Error state

Message:

`Team availability could not be loaded. Please try again.`

Provide a retry button.

### Invalid schedule

Show:

- `Schedule unavailable`;
- a tooltip explaining whether the time zone or working hours are missing/invalid;
- do not crash the whole page.

---

## 14. Acceptance Criteria

1. The application is branded as **Agility Insights**.
2. The header background is `#7296C4`.
3. The application uses Times New Roman or a Times serif fallback.
4. The table header is `#E2E2E5` with black text.
5. KSA current time and date are displayed and update automatically.
6. Viewer time zone is detected without blocking the page.
7. Search works for name, team, role, location, and email.
8. Team, role, and location filters work individually and together.
9. Reset restores the default list.
10. Every employee row displays local time.
11. Every employee row displays local working hours.
12. Every employee row displays the full working-hours range converted to KSA.
13. Hours left never becomes negative.
14. Default scheduled log-off is 11:00 PM in each employee's local time.
15. Time calculations use IANA time zones and respect daylight-saving behavior.
16. Shared members are marked.
17. Sorting and pagination work with filtered results.
18. Employees with at least 4.5 working hours left are identifiable as deployment eligible.
19. The 4.5-hour deployment requirement card is displayed.
20. The communication-before-4:00-PM-KSA note is displayed.
21. The page shows a warning after the preferred KSA communication cutoff.
22. The page is usable on desktop, tablet, and mobile.
23. All main controls are keyboard accessible.
24. Denying geolocation permission does not break the application.
25. The UI does not claim to know actual attendance or actual logout unless provided by a backend API.
26. The project runs with standard commands documented in the README.
27. TypeScript compiles with no errors in strict mode.
28. No Goldman Sachs branding or assets remain.

---

## 15. Minimum Automated Tests

Use Vitest and React Testing Library, or equivalent.

Required tests:

1. KSA time is formatted using `Asia/Riyadh`.
2. Employee local time uses the employee time zone.
3. Local shift converts correctly to KSA.
4. Hours left is correct during a shift.
5. Hours left is zero after shift end.
6. Before shift start, status and `Starts in` are correct.
7. Non-working day returns the correct status.
8. Deployment eligibility is true at 4.5 hours or more.
9. Deployment eligibility is false below 4.5 hours.
10. Search finds name, team, role, and location.
11. Combined filters return the correct rows.
12. Reset clears all filters.
13. Pagination resets to page 1 after filtering.
14. Invalid time-zone data produces `Schedule Unavailable`.
15. The 4:00 PM KSA advisory warning is shown after the cutoff.

Use fake timers or an injectable `now` value so tests are deterministic.

---

## 16. Deliverables Expected from Claude

Claude should return a complete runnable project containing:

- Vite React TypeScript application;
- all components and styles;
- the supplied JSON seed data;
- time-zone and availability calculation utilities;
- search, filters, sorting, and pagination;
- responsive desktop/tablet/mobile layouts;
- unit/component tests;
- `README.md` with:
  - prerequisites;
  - install command;
  - development command;
  - test command;
  - production build command;
  - explanation of the time-zone approach;
  - explanation that status is schedule-based, not attendance-based.

Recommended commands:

```bash
npm install
npm run dev
npm run test
npm run build
```

---

## 17. Instruction to Claude

Build the application exactly from this document. Where a requirement is explicit, do not replace it with a different design or behavior. Keep all business settings configurable. Do not hardcode employee-specific calculated times. Use the supplied IANA time zones and calculate all time values from the current instant.

The final result should be polished enough for a Business Owner demonstration and structured cleanly enough for later API integration.
