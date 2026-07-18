import type { MemberAvailability, AvailabilityStatus } from '../types/availability'

export type SortKey =
  | 'ksa-soonest'
  | 'name-asc'
  | 'team-asc'
  | 'location-asc'
  | 'hours-left-desc'
  | 'hours-left-asc'
  | 'local-end-asc'
  | 'available-first'
  | 'deployment-first'

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'ksa-soonest', label: 'KSA Time (Soonest Available)' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'team-asc', label: 'Team A–Z' },
  { value: 'location-asc', label: 'Location A–Z' },
  { value: 'hours-left-desc', label: 'Hours Left — Highest First' },
  { value: 'hours-left-asc', label: 'Hours Left — Lowest First' },
  { value: 'local-end-asc', label: 'Local End Time — Earliest First' },
  { value: 'available-first', label: 'Currently Available First' },
  { value: 'deployment-first', label: 'Deployment Eligible First' },
]

export type TeamFilterState = {
  search: string
  teams: string[]
  roles: string[]
  locations: string[]
  statuses: AvailabilityStatus[]
  minimumHoursLeft: number | null
  deploymentEligibleOnly: boolean
  withinWorkingHoursOnly: boolean
  sharedOnly: boolean
}

export const DEFAULT_FILTER_STATE: TeamFilterState = {
  search: '',
  teams: [],
  roles: [],
  locations: [],
  statuses: [],
  minimumHoursLeft: null,
  deploymentEligibleOnly: false,
  withinWorkingHoursOnly: false,
  sharedOnly: false,
}

export const DEFAULT_SORT: SortKey = 'ksa-soonest'

/** How "reachable now" a status is. Lower sorts first. */
const STATUS_RANK: Record<AvailabilityStatus, number> = {
  online: 0,
  limited: 1,
  'starts-soon': 2,
  offline: 3,
  'non-working-day': 4,
  'schedule-unavailable': 5,
}

/**
 * Free-text match across name, team, role, location and email.
 * Case-insensitive, trimmed, partial matches, and every whitespace-separated
 * term must match somewhere (so "warriors qa" narrows rather than widens).
 */
export function matchesSearch(entry: MemberAvailability, rawSearch: string): boolean {
  const search = rawSearch.trim().toLowerCase()
  if (!search) return true

  const { member } = entry
  const haystack = [
    member.name,
    member.team,
    member.role,
    member.locationLabel,
    member.email ?? '',
    member.isShared ? 'shared' : '',
  ]
    .join(' ')
    .toLowerCase()

  return search.split(/\s+/).every((term) => haystack.includes(term))
}

export function applyFilters(
  entries: MemberAvailability[],
  filters: TeamFilterState,
): MemberAvailability[] {
  return entries.filter((entry) => {
    const { member, availability } = entry

    if (!matchesSearch(entry, filters.search)) return false
    if (filters.teams.length > 0 && !filters.teams.includes(member.team)) return false
    if (filters.roles.length > 0 && !filters.roles.includes(member.role)) return false
    if (
      filters.locations.length > 0 &&
      !filters.locations.includes(member.locationLabel)
    ) {
      return false
    }
    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(availability.status)
    ) {
      return false
    }
    if (
      filters.minimumHoursLeft !== null &&
      availability.hoursLeft < filters.minimumHoursLeft
    ) {
      return false
    }
    if (filters.deploymentEligibleOnly && !availability.deploymentEligible) return false
    if (filters.withinWorkingHoursOnly && !availability.isWithinWorkingHours) return false
    if (filters.sharedOnly && !member.isShared) return false

    return true
  })
}

const byName = (a: MemberAvailability, b: MemberAvailability) =>
  a.member.name.localeCompare(b.member.name)

const endTime = (entry: MemberAvailability) =>
  entry.availability.localWorkEnd?.getTime() ?? Number.POSITIVE_INFINITY

/**
 * Sorting never mutates the input. Every comparator falls back to name so the
 * order is stable and reproducible across renders.
 */
export function applySort(
  entries: MemberAvailability[],
  sort: SortKey,
): MemberAvailability[] {
  const sorted = [...entries]

  switch (sort) {
    case 'name-asc':
      return sorted.sort(byName)

    case 'team-asc':
      return sorted.sort(
        (a, b) => a.member.team.localeCompare(b.member.team) || byName(a, b),
      )

    case 'location-asc':
      return sorted.sort(
        (a, b) =>
          a.member.locationLabel.localeCompare(b.member.locationLabel) || byName(a, b),
      )

    case 'hours-left-desc':
      return sorted.sort(
        (a, b) => b.availability.hoursLeft - a.availability.hoursLeft || byName(a, b),
      )

    case 'hours-left-asc':
      return sorted.sort(
        (a, b) => a.availability.hoursLeft - b.availability.hoursLeft || byName(a, b),
      )

    case 'local-end-asc':
      return sorted.sort((a, b) => endTime(a) - endTime(b) || byName(a, b))

    case 'available-first':
      return sorted.sort(
        (a, b) =>
          STATUS_RANK[a.availability.status] - STATUS_RANK[b.availability.status] ||
          b.availability.hoursLeft - a.availability.hoursLeft ||
          byName(a, b),
      )

    case 'deployment-first':
      return sorted.sort(
        (a, b) =>
          Number(b.availability.deploymentEligible) -
            Number(a.availability.deploymentEligible) ||
          b.availability.hoursLeft - a.availability.hoursLeft ||
          byName(a, b),
      )

    case 'ksa-soonest':
    default:
      // Business default: people you can actually reach right now, ordered by
      // the largest remaining overlap; then people about to start, soonest
      // first; then everyone else alphabetically.
      return sorted.sort((a, b) => {
        const groupA = reachabilityGroup(a)
        const groupB = reachabilityGroup(b)
        if (groupA !== groupB) return groupA - groupB

        if (groupA === 0) {
          return b.availability.hoursLeft - a.availability.hoursLeft || byName(a, b)
        }
        if (groupA === 1) {
          return (
            (a.availability.startsInHours ?? 0) - (b.availability.startsInHours ?? 0) ||
            byName(a, b)
          )
        }
        return byName(a, b)
      })
  }
}

/** 0 = working now, 1 = shift still to open today, 2 = unavailable. */
function reachabilityGroup(entry: MemberAvailability): number {
  if (entry.availability.isWithinWorkingHours) return 0
  if (entry.availability.startsInHours !== null) return 1
  return 2
}

/** Sorted, de-duplicated dropdown options built from the dataset itself. */
export function getUniqueValues<T>(items: T[], selector: (item: T) => string): string[] {
  const seen = new Set<string>()
  for (const item of items) {
    const value = selector(item)
    if (value) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

export function isFilterStateDefault(filters: TeamFilterState): boolean {
  return (
    filters.search.trim() === '' &&
    filters.teams.length === 0 &&
    filters.roles.length === 0 &&
    filters.locations.length === 0 &&
    filters.statuses.length === 0 &&
    filters.minimumHoursLeft === null &&
    !filters.deploymentEligibleOnly &&
    !filters.withinWorkingHoursOnly &&
    !filters.sharedOnly
  )
}

/** Count of active "More Filters" selections, for the button badge. */
export function countAdvancedFilters(filters: TeamFilterState): number {
  let count = 0
  if (filters.statuses.length > 0) count += filters.statuses.length
  if (filters.minimumHoursLeft !== null) count += 1
  if (filters.deploymentEligibleOnly) count += 1
  if (filters.withinWorkingHoursOnly) count += 1
  if (filters.sharedOnly) count += 1
  return count
}
