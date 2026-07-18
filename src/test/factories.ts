import type { TeamMember } from '../types/teamMember'
import type { MemberAvailability } from '../types/availability'
import { computeAvailability } from '../utils/availabilityUtils'

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

export function makeEntry(member: TeamMember, now: Date): MemberAvailability {
  return { member, availability: computeAvailability(member, now) }
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
  /** 18:30 IST — exactly 4.5 h remaining. */
  mondayExactlyDeploymentWindowIst: new Date('2026-07-20T13:00:00Z'),
  /** 18:31 IST — just under 4.5 h remaining. */
  mondayJustUnderDeploymentWindowIst: new Date('2026-07-20T13:01:00Z'),
  /** 23:30 IST — after the shift closed. */
  mondayAfterShiftIst: new Date('2026-07-20T18:00:00Z'),
  /** Sunday 19 July 2026, 14:30 IST — a non-working day. */
  sundayMiddayIst: new Date('2026-07-19T09:00:00Z'),
  /** 12:00 KSA — before the 16:00 communication cutoff. */
  ksaBeforeCutoff: new Date('2026-07-20T09:00:00Z'),
  /** 17:00 KSA — after the 16:00 communication cutoff. */
  ksaAfterCutoff: new Date('2026-07-20T14:00:00Z'),
} as const
