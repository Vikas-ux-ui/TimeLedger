import { getSeedSettings } from '../services/teamAvailabilityService'

/**
 * Single source of truth for business configuration.
 *
 * Values are read from the configuration file's `settings` block through the
 * existing data-access boundary, validated, and merged over the defaults
 * below. Every call site keeps reading `APP_SETTINGS`, so changing a value in
 * the JSON changes the application's behaviour with no code change.
 *
 * Anything missing or invalid falls back to its default rather than throwing:
 * a bad config entry degrades one setting, it never takes the page down.
 */

/** Used when the configuration file omits a field or supplies an invalid one. */
export const DEFAULT_SETTINGS = {
  applicationName: 'Agility Insights',
  pageTitle: 'Global Team Availability',
  pageSubtitle: 'Find the right time to connect',
  ksaTimeZone: 'Asia/Riyadh',
  productionDeploymentMinimumHours: 5,
  productionCommunicationCutoffKsa: '16:00',
  defaultWorkStartLocal: '09:00',
  defaultWorkEndLocal: '23:00',
  primaryHeaderColor: '#7296C4',
  tableHeaderColor: '#E2E2E5',
  fontFamily: '"Tajawal", sans-serif',
} as const

export type AppSettings = {
  -readonly [K in keyof typeof DEFAULT_SETTINGS]: (typeof DEFAULT_SETTINGS)[K] extends number
    ? number
    : string
}

/**
 * A shift cannot exceed a day, so a minimum beyond that would make every
 * person permanently ineligible — treated as a config error, not a rule.
 */
const MAX_DEPLOYMENT_MINIMUM_HOURS = 24

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function warn(field: string, value: unknown, reason: string, fallback: unknown): void {
  console.warn(
    `[settings] Ignoring "${field}": ${reason} (received ${JSON.stringify(value)}). ` +
      `Falling back to ${JSON.stringify(fallback)}.`,
  )
}

/** A finite, non-negative number within an inclusive upper bound. */
function readHours(
  raw: Record<string, unknown>,
  field: string,
  fallback: number,
  max: number,
): number {
  const value = raw[field]
  if (value === undefined || value === null) return fallback

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    warn(field, value, 'expected a finite number', fallback)
    return fallback
  }
  if (value < 0) {
    warn(field, value, 'must not be negative', fallback)
    return fallback
  }
  if (value > max) {
    warn(field, value, `must not exceed ${max}`, fallback)
    return fallback
  }
  return value
}

/** A 24-hour `HH:mm` string. */
function readTimeOfDay(
  raw: Record<string, unknown>,
  field: string,
  fallback: string,
): string {
  const value = raw[field]
  if (value === undefined || value === null) return fallback

  if (typeof value !== 'string' || !TIME_OF_DAY_PATTERN.test(value.trim())) {
    warn(field, value, 'expected a HH:mm time', fallback)
    return fallback
  }
  return value.trim()
}

/**
 * An IANA identifier this runtime can resolve.
 * Checked with `Intl` directly rather than the time-zone utilities, which
 * import this module — going through them would create a cycle.
 */
function readTimeZone(
  raw: Record<string, unknown>,
  field: string,
  fallback: string,
): string {
  const value = raw[field]
  if (value === undefined || value === null) return fallback

  if (typeof value !== 'string' || value.trim() === '') {
    warn(field, value, 'expected a non-empty IANA time zone', fallback)
    return fallback
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() })
  } catch {
    warn(field, value, 'is not a time zone this runtime recognises', fallback)
    return fallback
  }
  return value.trim()
}

/**
 * Merges a raw `settings` block over the defaults, validating each field.
 * Pure and exported so the rules can be tested directly.
 */
export function resolveSettings(rawSettings: unknown): AppSettings {
  const raw: Record<string, unknown> =
    typeof rawSettings === 'object' && rawSettings !== null
      ? (rawSettings as Record<string, unknown>)
      : {}

  return {
    ...DEFAULT_SETTINGS,
    ksaTimeZone: readTimeZone(raw, 'ksaTimeZone', DEFAULT_SETTINGS.ksaTimeZone),
    productionDeploymentMinimumHours: readHours(
      raw,
      'productionDeploymentMinimumHours',
      DEFAULT_SETTINGS.productionDeploymentMinimumHours,
      MAX_DEPLOYMENT_MINIMUM_HOURS,
    ),
    productionCommunicationCutoffKsa: readTimeOfDay(
      raw,
      'productionCommunicationCutoffKsa',
      DEFAULT_SETTINGS.productionCommunicationCutoffKsa,
    ),
    defaultWorkStartLocal: readTimeOfDay(
      raw,
      'defaultWorkStartLocal',
      DEFAULT_SETTINGS.defaultWorkStartLocal,
    ),
    defaultWorkEndLocal: readTimeOfDay(
      raw,
      'defaultWorkEndLocal',
      DEFAULT_SETTINGS.defaultWorkEndLocal,
    ),
  }
}

/** The resolved configuration every component and utility reads. */
export const APP_SETTINGS: AppSettings = resolveSettings(getSeedSettings())

/** A shift opening within this many hours reads as `Starts Soon`. */
export const STARTS_SOON_THRESHOLD_HOURS = 2

/** How often the shared page clock re-reads the current instant. */
export const CLOCK_TICK_MS = 30_000

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const

export const DEFAULT_ROWS_PER_PAGE = 10
