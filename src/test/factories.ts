import type { TeamMember } from '../types/teamMember'
import type { MemberAvailability } from '../types/availability'
import { computeAvailability, type AvailabilityOptions } from '../utils/availabilityUtils'
import { APP_SETTINGS } from '../config/settings'

const MS_PER_HOUR = 3_600_000

/** The default India shift (09:00–23:00 IST) closes at 17:30 UTC. */
const INDIA_SHIFT_END_UTC = new Date('2026-07-20T17:30:00Z').getTime()

/**
 * Boundary instants are derived from the configured deployment minimum rather
 * than hardcoded, so changing that business rule does not require rewriting
 * the fixtures — the tests keep exercising the real boundary either way.
 */
const deploymentMinimumMs = APP_SETTINGS.productionDeploymentMinimumHours * MS_PER_HOUR

/**
 * Shared fixtures.
 *
 * Every test supplies an explicit `now`, so results never depend on when the
 * suite happens to run.
 */
export function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: overrides.id ?? 'test-member',
    name: 'Asha Rao',
    email: 'asha.rao@agilityinsights.ai',
    team: 'Warriors',
    role: 'Dev',
    locationLabel: 'India',
    timeZone: 'Asia/Kolkata',
    countryCode: 'IN',
    isShared: false,
    workSchedule: {
      startLocal: '09:00',
      endLocal: '23:00',
      workDays: [1, 2, 3, 4, 5],
    },
    ...overrides,
  }
}

/**
 * `options` lets a test pin the deployment minimum locally, so its assertions
 * do not shift when the configured business value changes.
 */
export function makeEntry(
  member: TeamMember,
  now: Date,
  options?: AvailabilityOptions,
): MemberAvailability {
  return { member, availability: computeAvailability(member, now, options) }
}

/**
 * Reference instants, all on Monday 20 July 2026 unless noted.
 * A 09:00–23:00 IST shift spans 03:30Z – 17:30Z that day.
 */
export const INSTANTS = {
  /** 07:30 IST — 3.5 h before the shift opens. */
  mondayEarlyMorningIst: new Date('2026-07-20T00:00:00Z'),
  /** 07:30 IST is 1.5 h out; this is 08:00 IST, 1 h before the shift. */
  mondayJustBeforeShiftIst: new Date('2026-07-20T02:30:00Z'),
  /** 14:30 IST — mid-shift, 8.5 h remaining. */
  mondayMidShiftIst: new Date('2026-07-20T09:00:00Z'),
  /** Exactly the configured deployment minimum remains in the India shift. */
  mondayExactlyDeploymentWindowIst: new Date(INDIA_SHIFT_END_UTC - deploymentMinimumMs),
  /** One minute past that boundary, so the window is just too short. */
  mondayJustUnderDeploymentWindowIst: new Date(
    INDIA_SHIFT_END_UTC - deploymentMinimumMs + 60_000,
  ),
  /** 23:30 IST — after the shift closed. */
  mondayAfterShiftIst: new Date('2026-07-20T18:00:00Z'),
  /** Sunday 19 July 2026, 14:30 IST — a non-working day. */
  sundayMiddayIst: new Date('2026-07-19T09:00:00Z'),
  /** 12:00 KSA — before the 16:00 communication cutoff. */
  ksaBeforeCutoff: new Date('2026-07-20T09:00:00Z'),
  /** 17:00 KSA — after the 16:00 communication cutoff. */
  ksaAfterCutoff: new Date('2026-07-20T14:00:00Z'),
} as const
