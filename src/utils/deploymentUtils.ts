import type { MemberAvailability } from '../types/availability'

const MS_PER_HOUR = 3_600_000

/**
 * The instant a deployment started now would be expected to finish.
 *
 * A plain instant, so converting it into any member's zone for display is just
 * a formatting step — no offset arithmetic is involved.
 */
export function getExpectedCompletion(now: Date, minimumHours: number): Date {
  const safeHours = Number.isFinite(minimumHours) ? Math.max(0, minimumHours) : 0
  return new Date(now.getTime() + safeHours * MS_PER_HOUR)
}

/**
 * The members who can still see a deployment through to completion.
 *
 * This deliberately reuses `deploymentEligible` rather than re-deriving the
 * rule, because the two are the same statement:
 *
 *   deploymentEligible = isWithinWorkingHours && hoursLeft >= minimumHours
 *   hoursLeft          = shiftEnd - now
 *
 *   hoursLeft >= minimumHours
 *     <=> shiftEnd - now >= minimumHours
 *     <=> shiftEnd >= now + minimumHours
 *     <=> shiftEnd >= expectedCompletion
 *
 * So "still working when the deployment completes" and "eligible" are one
 * condition. Computing it twice would risk the summary and the table's own
 * per-row indicator disagreeing.
 *
 * Members whose day has already ended fail `isWithinWorkingHours`; members
 * whose day ends before completion fail the hours test.
 */
export function selectDeploymentReady(
  entries: MemberAvailability[],
): MemberAvailability[] {
  return entries.filter((entry) => entry.availability.deploymentEligible)
}
