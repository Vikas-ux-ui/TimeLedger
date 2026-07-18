import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  applySort,
  DEFAULT_FILTER_STATE,
  getUniqueValues,
  isFilterStateDefault,
  matchesSearch,
  type TeamFilterState,
} from './filterUtils'
import { INSTANTS, makeEntry, makeMember } from '../test/factories'

const now = INSTANTS.mondayMidShiftIst

const entries = [
  makeEntry(
    makeMember({
      id: 'w-asha',
      name: 'Asha Rao',
      team: 'Warriors',
      role: 'Dev',
      locationLabel: 'India',
      email: 'asha.rao@agilityinsights.ai',
    }),
    now,
  ),
  makeEntry(
    makeMember({
      id: 'w-kamran',
      name: 'Kamran Musayev',
      team: 'Warriors',
      role: 'Backend',
      locationLabel: 'Azerbaijan',
      timeZone: 'Asia/Baku',
      email: 'kamran.musayev@agilityhealthradar.com',
    }),
    now,
  ),
  makeEntry(
    makeMember({
      id: 'g-lexi',
      name: 'Lexi Addams',
      team: 'Guardians',
      role: 'PO',
      locationLabel: 'Omaha, USA',
      timeZone: 'America/Chicago',
      email: 'lexi.addams@agilityinsights.ai',
    }),
    now,
  ),
  makeEntry(
    makeMember({
      id: 'f-anuj',
      name: 'Anuj Gupta',
      team: 'Fastlane',
      role: 'Tech Lead',
      locationLabel: 'India',
      isShared: true,
      email: 'anuj@agilityinsights.ai',
    }),
    now,
  ),
]

const withFilters = (overrides: Partial<TeamFilterState>): TeamFilterState => ({
  ...DEFAULT_FILTER_STATE,
  ...overrides,
})

const idsOf = (list: typeof entries) => list.map((entry) => entry.member.id)

describe('search', () => {
  // Required test 10
  it('finds members by name, team, role, location and email', () => {
    expect(matchesSearch(entries[0]!, 'asha')).toBe(true) // name
    expect(matchesSearch(entries[0]!, 'warriors')).toBe(true) // team
    expect(matchesSearch(entries[0]!, 'dev')).toBe(true) // role
    expect(matchesSearch(entries[0]!, 'india')).toBe(true) // location
    expect(matchesSearch(entries[0]!, 'agilityinsights')).toBe(true) // email
    expect(matchesSearch(entries[0]!, 'guardians')).toBe(false)
  })

  it('is case-insensitive, trims, and matches partial text', () => {
    expect(matchesSearch(entries[2]!, '  LEXI  ')).toBe(true)
    expect(matchesSearch(entries[2]!, 'add')).toBe(true)
    expect(matchesSearch(entries[2]!, 'OMAHA')).toBe(true)
  })

  it('requires every term to match, so extra words narrow the result', () => {
    expect(matchesSearch(entries[1]!, 'warriors backend')).toBe(true)
    expect(matchesSearch(entries[1]!, 'warriors frontend')).toBe(false)
  })

  it('matches the shared marker', () => {
    expect(matchesSearch(entries[3]!, 'shared')).toBe(true)
    expect(matchesSearch(entries[0]!, 'shared')).toBe(false)
  })
})

describe('applyFilters', () => {
  // Required test 11
  it('combines search, team, role and location filters', () => {
    const result = applyFilters(
      entries,
      withFilters({ teams: ['Warriors'], roles: ['Dev'] }),
    )
    expect(idsOf(result)).toEqual(['w-asha'])
  })

  it('returns nothing when combined filters cannot all be satisfied', () => {
    const result = applyFilters(
      entries,
      withFilters({ teams: ['Guardians'], roles: ['Backend'] }),
    )
    expect(result).toHaveLength(0)
  })

  it('filters by location', () => {
    const result = applyFilters(entries, withFilters({ locations: ['India'] }))
    expect(idsOf(result).sort()).toEqual(['f-anuj', 'w-asha'])
  })

  it('filters to shared members only', () => {
    const result = applyFilters(entries, withFilters({ sharedOnly: true }))
    expect(idsOf(result)).toEqual(['f-anuj'])
  })

  it('filters by minimum hours left', () => {
    // At this instant: India members are mid-shift with 8.5 h left, Baku is
    // mid-shift with 10 h, and Omaha has not started so it carries the full
    // 14 h upcoming shift (spec 6.3). A 9-hour bar therefore keeps the latter two.
    const result = applyFilters(entries, withFilters({ minimumHoursLeft: 9 }))
    expect(idsOf(result).sort()).toEqual(['g-lexi', 'w-kamran'])
  })

  it('separates hours left from the ability to deploy for pre-shift members', () => {
    // Omaha clears the hours bar on paper but is not reachable yet, so it must
    // not count as deployment eligible.
    const omaha = entries.find((entry) => entry.member.id === 'g-lexi')!
    expect(omaha.availability.hoursLeft).toBeGreaterThan(4.5)
    expect(omaha.availability.isWithinWorkingHours).toBe(false)
    expect(omaha.availability.deploymentEligible).toBe(false)
  })

  it('filters to deployment-eligible members', () => {
    const result = applyFilters(entries, withFilters({ deploymentEligibleOnly: true }))
    expect(result.every((entry) => entry.availability.deploymentEligible)).toBe(true)
    expect(idsOf(result)).toContain('w-asha')
    expect(idsOf(result)).not.toContain('g-lexi') // Omaha is not working yet
  })

  it('filters by status', () => {
    const result = applyFilters(entries, withFilters({ statuses: ['offline'] }))
    expect(idsOf(result)).toContain('g-lexi')
    expect(idsOf(result)).not.toContain('w-asha')
  })

  it('returns every entry with the default filter state', () => {
    expect(applyFilters(entries, DEFAULT_FILTER_STATE)).toHaveLength(entries.length)
  })
})

describe('applySort', () => {
  it('sorts by name', () => {
    expect(idsOf(applySort(entries, 'name-asc'))).toEqual([
      'f-anuj',
      'w-asha',
      'w-kamran',
      'g-lexi',
    ])
  })

  it('sorts by hours left, highest first', () => {
    const sorted = applySort(entries, 'hours-left-desc')
    const hours = sorted.map((entry) => entry.availability.hoursLeft)
    expect([...hours]).toEqual([...hours].sort((a, b) => b - a))
  })

  it('puts currently-working members first by default', () => {
    const sorted = applySort(entries, 'ksa-soonest')
    expect(sorted[0]!.availability.isWithinWorkingHours).toBe(true)
    // Members outside working hours sink below those inside them.
    const firstUnavailable = sorted.findIndex(
      (entry) => !entry.availability.isWithinWorkingHours,
    )
    const lastAvailable = sorted.findLastIndex(
      (entry) => entry.availability.isWithinWorkingHours,
    )
    expect(lastAvailable).toBeLessThan(firstUnavailable)
  })

  it('does not mutate the input array', () => {
    const original = idsOf(entries)
    applySort(entries, 'name-asc')
    expect(idsOf(entries)).toEqual(original)
  })
})

describe('option builders', () => {
  it('produces sorted, de-duplicated dropdown options', () => {
    const members = entries.map((entry) => entry.member)
    expect(getUniqueValues(members, (m) => m.team)).toEqual([
      'Fastlane',
      'Guardians',
      'Warriors',
    ])
    expect(getUniqueValues(members, (m) => m.locationLabel)).toEqual([
      'Azerbaijan',
      'India',
      'Omaha, USA',
    ])
  })

  it('recognises the default filter state', () => {
    expect(isFilterStateDefault(DEFAULT_FILTER_STATE)).toBe(true)
    expect(isFilterStateDefault(withFilters({ search: 'asha' }))).toBe(false)
    expect(isFilterStateDefault(withFilters({ sharedOnly: true }))).toBe(false)
  })
})
