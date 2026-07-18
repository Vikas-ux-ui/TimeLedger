import { DateTime } from 'luxon'
import type { TeamMember } from '../types/teamMember'
import type { CalculatedAvailability } from '../types/availability'
import { APP_SETTINGS, STARTS_SOON_THRESHOLD_HOURS } from '../config/settings'
import { isValidTimeZone, parseTimeOfDay } from './timeZoneUtils'

const MS_PER_HOUR = 1000 * 60 * 60

export type AvailabilityOptions = {
  /** Hours of remaining shift required to be deployment eligible. */
  minimumDeploymentHours?: number
  /** A shift opening within this window reads as `Starts Soon`. */
  startsSoonThresholdHours?: number
}

function unavailable(now: Date, issue: string): CalculatedAvailability {
  return {
    localCurrentDateTime: now,
    localWorkStart: null,
    localWorkEnd: null,
    ksaWorkStart: null,
    ksaWorkEnd: null,
    hoursLeft: 0,
    startsInHours: null,
    elapsedHours: 0,
    isWithinWorkingHours: false,
    deploymentEligible: false,
    status: 'schedule-unavailable',
    scheduleIssue: issue,
  }
}

/**
 * Derives a member's scheduled availability for a given instant.
 *
 * This describes the member's *schedule* only. It makes no claim about actual
 * login, logout, attendance, or presence — `online` means "currently inside
 * scheduled working hours", nothing more.
 *
 * `now` is injected rather than read from the clock so the whole page shares a
 * single instant and tests stay deterministic.
 */
export function computeAvailability(
  member: TeamMember,
  now: Date,
  options: AvailabilityOptions = {},
): CalculatedAvailability {
  const minimumDeploymentHours =
    options.minimumDeploymentHours ?? APP_SETTINGS.productionDeploymentMinimumHours
  const startsSoonThreshold =
    options.startsSoonThresholdHours ?? STARTS_SOON_THRESHOLD_HOURS

  // --- Validate the inputs before trusting any calculation -----------------
  if (!isValidTimeZone(member.timeZone)) {
    return unavailable(now, `Time zone is missing or invalid: "${member.timeZone ?? ''}"`)
  }

  const schedule = member.workSchedule
  if (!schedule) return unavailable(now, 'Working hours are missing.')

  const start = parseTimeOfDay(schedule.startLocal)
  const end = parseTimeOfDay(schedule.endLocal)
  if (!start || !end) {
    return unavailable(now, 'Working hours are missing or not in HH:mm format.')
  }

  const workDays = schedule.workDays
  if (!Array.isArray(workDays) || workDays.length === 0) {
    return unavailable(now, 'No working days are configured.')
  }

  // --- Build today's shift boundaries in the member's own zone -------------
  const local = DateTime.fromJSDate(now, { zone: member.timeZone })
  const localCurrentDateTime = local.toJSDate()

  let shiftStart = local.set({
    hour: start.hour,
    minute: start.minute,
    second: 0,
    millisecond: 0,
  })
  let shiftEnd = local.set({
    hour: end.hour,
    minute: end.minute,
    second: 0,
    millisecond: 0,
  })

  // An end at or before the start means the shift runs past midnight.
  if (shiftEnd <= shiftStart) shiftEnd = shiftEnd.plus({ days: 1 })

  // For an overnight shift, a `now` in the small hours still belongs to the
  // shift that opened on the previous calendar day.
  if (shiftEnd.day !== shiftStart.day && local < shiftStart) {
    const previousStart = shiftStart.minus({ days: 1 })
    const previousEnd = shiftEnd.minus({ days: 1 })
    if (local >= previousStart && local < previousEnd) {
      shiftStart = previousStart
      shiftEnd = previousEnd
    }
  }

  const localWorkStart = shiftStart.toJSDate()
  const localWorkEnd = shiftEnd.toJSDate()
  // The same instants, only re-expressed for display in KSA.
  const ksaWorkStart = shiftStart.setZone(APP_SETTINGS.ksaTimeZone).toJSDate()
  const ksaWorkEnd = shiftEnd.setZone(APP_SETTINGS.ksaTimeZone).toJSDate()

  const base = {
    localCurrentDateTime,
    localWorkStart,
    localWorkEnd,
    ksaWorkStart,
    ksaWorkEnd,
  }

  // --- Non-working day -----------------------------------------------------
  // The weekday is judged in the member's own zone, using ISO numbering
  // (Monday = 1 ... Sunday = 7), which is what Luxon's `weekday` returns.
  if (!workDays.includes(shiftStart.weekday)) {
    return {
      ...base,
      hoursLeft: 0,
      startsInHours: null,
      elapsedHours: 0,
      isWithinWorkingHours: false,
      deploymentEligible: false,
      status: 'non-working-day',
    }
  }

  const nowMs = now.getTime()
  const startMs = localWorkStart.getTime()
  const endMs = localWorkEnd.getTime()
  const shiftDurationHours = (endMs - startMs) / MS_PER_HOUR

  // --- Before the shift opens ---------------------------------------------
  if (nowMs < startMs) {
    const startsInHours = (startMs - nowMs) / MS_PER_HOUR
    return {
      ...base,
      // Nothing has been consumed yet, so the whole shift is still ahead.
      hoursLeft: shiftDurationHours,
      startsInHours,
      elapsedHours: 0,
      isWithinWorkingHours: false,
      deploymentEligible: false,
      status: startsInHours <= startsSoonThreshold ? 'starts-soon' : 'offline',
    }
  }

  // --- After the shift closes ---------------------------------------------
  if (nowMs >= endMs) {
    return {
      ...base,
      hoursLeft: 0,
      startsInHours: null,
      elapsedHours: shiftDurationHours,
      isWithinWorkingHours: false,
      deploymentEligible: false,
      status: 'offline',
    }
  }

  // --- Inside the shift ----------------------------------------------------
  const hoursLeft = Math.max(0, (endMs - nowMs) / MS_PER_HOUR)
  const elapsedHours = Math.max(0, (nowMs - startMs) / MS_PER_HOUR)

  return {
    ...base,
    hoursLeft,
    startsInHours: null,
    elapsedHours,
    isWithinWorkingHours: true,
    deploymentEligible: hoursLeft >= minimumDeploymentHours,
    status: hoursLeft >= minimumDeploymentHours ? 'online' : 'limited',
  }
}
