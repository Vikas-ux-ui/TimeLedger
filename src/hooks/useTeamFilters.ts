import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TeamMember } from '../types/teamMember'
import type { MemberAvailability } from '../types/availability'
import { computeAvailability } from '../utils/availabilityUtils'
import {
  applyFilters,
  applySort,
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT,
  getUniqueValues,
  type SortKey,
  type TeamFilterState,
} from '../utils/filterUtils'
import { DEFAULT_ROWS_PER_PAGE } from '../config/settings'

export type UseTeamFiltersResult = {
  filters: TeamFilterState
  setFilters: (updater: Partial<TeamFilterState>) => void
  sort: SortKey
  setSort: (sort: SortKey) => void
  page: number
  setPage: (page: number) => void
  rowsPerPage: number
  setRowsPerPage: (rows: number) => void
  reset: () => void

  /** Every member paired with availability for the shared `now`. */
  allEntries: MemberAvailability[]
  /** After filters and sorting, before pagination. */
  filteredEntries: MemberAvailability[]
  /** The current page's slice. */
  paginatedEntries: MemberAvailability[]

  totalCount: number
  filteredCount: number
  totalPages: number
  rangeStart: number
  rangeEnd: number

  teamOptions: string[]
  roleOptions: string[]
  locationOptions: string[]
}

/**
 * Owns all list state — filters, sort and pagination — and derives the visible
 * rows from it. Each derivation is memoized separately so that, for example,
 * paging does not re-run availability maths for the whole dataset.
 */
export function useTeamFilters(
  members: TeamMember[],
  now: Date,
): UseTeamFiltersResult {
  const [filters, setFiltersState] = useState<TeamFilterState>(DEFAULT_FILTER_STATE)
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPageState] = useState<number>(DEFAULT_ROWS_PER_PAGE)

  // Availability depends only on the dataset and the shared clock instant.
  const allEntries = useMemo<MemberAvailability[]>(
    () =>
      members.map((member) => ({
        member,
        availability: computeAvailability(member, now),
      })),
    [members, now],
  )

  const filteredEntries = useMemo(
    () => applySort(applyFilters(allEntries, filters), sort),
    [allEntries, filters, sort],
  )

  const filteredCount = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(filteredCount / rowsPerPage))

  // A filter change can shrink the list past the current page; clamp instead of
  // stranding the user on an empty page.
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedEntries = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage
    return filteredEntries.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredEntries, safePage, rowsPerPage])

  // Any change to the result set sends the reader back to the first page.
  const setFilters = useCallback((updater: Partial<TeamFilterState>) => {
    setFiltersState((current) => ({ ...current, ...updater }))
    setPage(1)
  }, [])

  const setRowsPerPage = useCallback((rows: number) => {
    setRowsPerPageState(rows)
    setPage(1)
  }, [])

  const reset = useCallback(() => {
    setFiltersState(DEFAULT_FILTER_STATE)
    setSort(DEFAULT_SORT)
    setRowsPerPageState(DEFAULT_ROWS_PER_PAGE)
    setPage(1)
  }, [])

  const teamOptions = useMemo(() => getUniqueValues(members, (m) => m.team), [members])
  const roleOptions = useMemo(() => getUniqueValues(members, (m) => m.role), [members])
  const locationOptions = useMemo(
    () => getUniqueValues(members, (m) => m.locationLabel),
    [members],
  )

  const rangeStart = filteredCount === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(safePage * rowsPerPage, filteredCount)

  return {
    filters,
    setFilters,
    sort,
    setSort,
    page: safePage,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    reset,
    allEntries,
    filteredEntries,
    paginatedEntries,
    totalCount: members.length,
    filteredCount,
    totalPages,
    rangeStart,
    rangeEnd,
    teamOptions,
    roleOptions,
    locationOptions,
  }
}
