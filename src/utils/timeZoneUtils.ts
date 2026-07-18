import { DateTime } from 'luxon'
import { APP_SETTINGS } from '../config/settings'

/**
 * All time-zone work goes through IANA identifiers. No UTC offset is ever
 * hardcoded, so daylight-saving transitions are handled by the tz database.
 */

/**
 * Deprecated tz-database aliases still reported by some platforms, mapped to
 * their canonical names.
 *
 * Windows and older runtimes commonly resolve India as `Asia/Calcutta`. Both
 * ids describe the same zone, so leaving it unmapped would show an outdated
 * city name and list the same zone twice in the override selector.
 */
const LEGACY_ZONE_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Europe/Kiev': 'Europe/Kyiv',
}

/** Canonical form of an IANA id, leaving unknown ids untouched. */
export function canonicalizeTimeZone(timeZone: string): string {
  return LEGACY_ZONE_ALIASES[timeZone] ?? timeZone
}

/** `true` when the string is an IANA zone this runtime can actually resolve. */
export function isValidTimeZone(timeZone: string | undefined | null): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false
  return DateTime.local().setZone(timeZone).isValid
}

/** Parses `HH:mm`. Returns `null` when malformed or out of range. */
export function parseTimeOfDay(
  value: string | undefined | null,
): { hour: number; minute: number } | null {
  if (!value || typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

/** `now` expressed in `timeZone`. */
export function toZone(now: Date, timeZone: string): DateTime {
  return DateTime.fromJSDate(now, { zone: timeZone })
}

/** e.g. `10:30 AM` */
export function formatTime(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('h:mm a')
}

/** e.g. `Tue, May 22` */
export function formatShortDate(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('ccc, LLL d')
}

/** e.g. `Tue, May 22, 2025` */
export function formatLongDate(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('ccc, LLL d, yyyy')
}

/**
 * A shift rendered as a range in one zone, e.g. `6:30 AM – 8:30 PM`.
 * When the range lands on a different calendar day in the target zone — which
 * happens often once a local shift is converted to KSA — the crossing day is
 * annotated so the reader is not misled.
 */
export function formatTimeRange(
  start: Date,
  end: Date,
  timeZone: string,
  options: { annotateDayShift?: boolean } = {},
): string {
  const startDt = DateTime.fromJSDate(start, { zone: timeZone })
  const endDt = DateTime.fromJSDate(end, { zone: timeZone })
  const base = `${startDt.toFormat('h:mm a')} – ${endDt.toFormat('h:mm a')}`

  if (!options.annotateDayShift) return base

  const dayDelta = endDt.startOf('day').diff(startDt.startOf('day'), 'days').days
  if (dayDelta >= 1) return `${base} (+${Math.round(dayDelta)}d)`
  return base
}

/** Current KSA (`Asia/Riyadh`) time as a Luxon DateTime. */
export function ksaNow(now: Date): DateTime {
  return DateTime.fromJSDate(now, { zone: APP_SETTINGS.ksaTimeZone })
}

/**
 * `true` once the current KSA wall-clock time is at or past the advisory
 * production-communication cutoff (default 16:00 KSA).
 */
export function isPastKsaCommunicationCutoff(
  now: Date,
  cutoff: string = APP_SETTINGS.productionCommunicationCutoffKsa,
): boolean {
  const parsed = parseTimeOfDay(cutoff)
  if (!parsed) return false
  const current = ksaNow(now)
  const cutoffDt = current.set({
    hour: parsed.hour,
    minute: parsed.minute,
    second: 0,
    millisecond: 0,
  })
  return current >= cutoffDt
}

/** The viewer's zone per the browser, falling back to KSA if unavailable. */
export function detectViewerTimeZone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected && isValidTimeZone(detected)) return canonicalizeTimeZone(detected)
  } catch {
    // Fall through to the default below.
  }
  return APP_SETTINGS.ksaTimeZone
}

/**
 * A readable region hint derived from the zone id alone.
 * The zone is only a coarse signal — we deliberately do not claim to know the
 * viewer's city or country from it.
 */
export function describeTimeZone(timeZone: string): string {
  const parts = timeZone.split('/')
  const city = (parts[parts.length - 1] ?? timeZone).replace(/_/g, ' ')
  return city
}
