/**
 * Availability is *scheduled* availability, derived purely from a member's
 * configured working hours and the current instant. It is never an assertion
 * about actual attendance, login, logout, or presence.
 */

export type AvailabilityStatus =
  | 'online'
  | 'limited'
  | 'starts-soon'
  | 'offline'
  | 'non-working-day'
  | 'schedule-unavailable'

export type CalculatedAvailability = {
  /** `now` rendered in the member's own time zone. */
  localCurrentDateTime: Date
  localWorkStart: Date | null
  localWorkEnd: Date | null
  /** The same shift instants, expressed for display in `Asia/Riyadh`. */
  ksaWorkStart: Date | null
  ksaWorkEnd: Date | null
  /** Remaining scheduled hours. Never negative. */
  hoursLeft: number
  /** Hours until the shift opens, or `null` once it has started. */
  startsInHours: number | null
  /** Hours elapsed since the shift opened. `0` before it starts. */
  elapsedHours: number
  isWithinWorkingHours: boolean
  /** `isWithinWorkingHours && hoursLeft >= productionDeploymentMinimumHours` */
  deploymentEligible: boolean
  status: AvailabilityStatus
  /** Populated only when `status === 'schedule-unavailable'`. */
  scheduleIssue?: string
}

/** A member paired with their availability for the current shared `now`. */
export type MemberAvailability = {
  member: import('./teamMember').TeamMember
  availability: CalculatedAvailability
}

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  online: 'Online',
  limited: 'Limited Time',
  'starts-soon': 'Starts Soon',
  offline: 'Offline',
  'non-working-day': 'Non-Working Day',
  'schedule-unavailable': 'Schedule Unavailable',
}
