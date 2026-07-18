/**
 * Core domain types for a team member and their working schedule.
 *
 * These types intentionally mirror the shape a future
 * `GET /api/team-availability` response would return, so the seed JSON can be
 * swapped for a live API without touching the components.
 */

export type WorkSchedule = {
  /** Local shift start, `HH:mm` in the member's own time zone. */
  startLocal: string
  /** Local shift end, `HH:mm` in the member's own time zone. */
  endLocal: string
  /** ISO weekday numbers the member works. Monday = 1 ... Sunday = 7. */
  workDays: number[]
}

export type TeamMember = {
  id: string
  /** Row number from the source spreadsheet, kept for traceability. */
  sourceSequence?: number
  name: string
  email?: string
  team: string
  role: string
  locationLabel: string
  /** IANA time-zone identifier, e.g. `Asia/Kolkata`. Never a fixed offset. */
  timeZone: string
  /** ISO 3166-1 alpha-2 country code, used only to render a flag. */
  countryCode?: string
  /** True when the same person appears on more than one team. */
  isShared?: boolean
  workSchedule: WorkSchedule
}

/** Production timeline settings, sourced from the seed data / future API. */
export type ProductionTimelineConfig = {
  minimumHours: number
  communicationCutoffKsa: string
}

/**
 * The `settings` block of the configuration file.
 *
 * Every field is optional: an older or partial config stays valid, and each
 * missing value falls back to its default in `resolveSettings`.
 */
export type ConfigurableSettings = {
  ksaTimeZone?: string
  productionDeploymentMinimumHours?: number
  productionCommunicationCutoffKsa?: string
  defaultWorkStartLocal?: string
  defaultWorkEndLocal?: string
}

export type TeamAvailabilitySeedData = {
  generatedAtUtc: string
  settings?: ConfigurableSettings
  items: TeamMember[]
}
