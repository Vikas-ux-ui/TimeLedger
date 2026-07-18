import { useId } from 'react'
import type { MemberAvailability } from '../../types/availability'
import { SORT_OPTIONS, type SortKey } from '../../utils/filterUtils'
import { APP_SETTINGS } from '../../config/settings'
import { TeamMemberRow } from '../TeamMemberRow/TeamMemberRow'
import { EmptyState } from '../EmptyState/EmptyState'
import { TableSkeleton } from './TableSkeleton'
import { InfoIcon } from '../icons/Icons'
import styles from './TeamAvailabilityTable.module.css'

type TeamAvailabilityTableProps = {
  entries: MemberAvailability[]
  now: Date
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  filteredCount: number
  totalCount: number
  isLoading: boolean
  onResetFilters: () => void
  /** Commits an edited local end-of-day time for a member. */
  onLogoutTimeChange: (id: string, endLocal: string) => void
  /** Rendered under the table — pagination lives outside the scroll area. */
  footer?: React.ReactNode
}

type ColumnDef = {
  key: string
  label: string
  subLabel?: string
  /** Sort applied when the header is activated, if the column is sortable. */
  sortKey?: SortKey
  /** The opposite direction, for toggling on a second activation. */
  altSortKey?: SortKey
  info?: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'member', label: 'Team Member', sortKey: 'name-asc' },
  { key: 'team', label: 'Team', sortKey: 'team-asc' },
  { key: 'location', label: 'Location', sortKey: 'location-asc' },
  { key: 'localTime', label: 'Local Time' },
  {
    key: 'localHours',
    label: 'Local Working Hours',
    subLabel: '(Today)',
    sortKey: 'local-end-asc',
  },
  {
    key: 'logoutTime',
    label: 'Logout Time',
    subLabel: '(Local)',
    info: 'The scheduled end of this member’s working day, in their own time zone. Editing it updates their working hours, hours left and status.',
  },
  { key: 'ksaTime', label: 'KSA Current Time' },
  { key: 'ksaHours', label: 'Working Hours in KSA' },
  {
    key: 'hoursLeft',
    label: 'Hours Left',
    subLabel: 'for the Day',
    sortKey: 'hours-left-desc',
    altSortKey: 'hours-left-asc',
    info: 'Remaining scheduled working time before the local end of day. This reflects the configured schedule, not actual attendance.',
  },
  { key: 'status', label: 'Status', sortKey: 'available-first' },
  { key: 'actions', label: 'Actions' },
]

export function TeamAvailabilityTable({
  entries,
  now,
  sort,
  onSortChange,
  filteredCount,
  totalCount,
  isLoading,
  onResetFilters,
  onLogoutTimeChange,
  footer,
}: TeamAvailabilityTableProps) {
  const sortSelectId = useId()

  const ariaSortFor = (column: ColumnDef): React.AriaAttributes['aria-sort'] => {
    if (!column.sortKey) return undefined
    if (sort === column.sortKey) {
      return column.sortKey.endsWith('-asc') ? 'ascending' : 'descending'
    }
    if (column.altSortKey && sort === column.altSortKey) {
      return column.altSortKey.endsWith('-asc') ? 'ascending' : 'descending'
    }
    return 'none'
  }

  const handleHeaderSort = (column: ColumnDef) => {
    if (!column.sortKey) return
    // A second activation flips to the opposite direction where one exists.
    if (column.altSortKey && sort === column.sortKey) {
      onSortChange(column.altSortKey)
      return
    }
    onSortChange(column.sortKey)
  }

  return (
    <section className={styles.card} aria-label="Team availability">
      <div className={styles.summaryBar}>
        {/* Announced politely so filtering feeds back to screen readers
            without stealing focus. */}
        <p className={styles.summaryText} aria-live="polite" aria-atomic="true">
          {isLoading ? (
            'Loading team members…'
          ) : (
            <>
              Showing <span className={styles.summaryCount}>{filteredCount}</span> of{' '}
              <span className={styles.summaryCount}>{totalCount}</span> team members
            </>
          )}
        </p>

        <div className={styles.sortGroup}>
          <label className={styles.sortLabel} htmlFor={sortSelectId}>
            Sort by
          </label>
          <select
            id={sortSelectId}
            className={styles.sortSelect}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className="sr-only">
            Scheduled availability for {totalCount} team members. Columns cover local
            time, local working hours, the same hours converted to{' '}
            {APP_SETTINGS.ksaTimeZone}, and remaining scheduled time.
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" aria-sort={ariaSortFor(column)}>
                  {column.key === 'actions' ? (
                    <span className="sr-only">{column.label}</span>
                  ) : column.sortKey ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleHeaderSort(column)}
                    >
                      <span>
                        {column.label}
                        {column.subLabel && (
                          <span className={styles.headerSubLabel}>{column.subLabel}</span>
                        )}
                      </span>
                      <span className={styles.sortIndicator} aria-hidden="true">
                        {ariaSortFor(column) === 'ascending'
                          ? '▲'
                          : ariaSortFor(column) === 'descending'
                            ? '▼'
                            : '⇅'}
                      </span>
                    </button>
                  ) : (
                    <span>
                      {column.label}
                      {column.subLabel && (
                        <span className={styles.headerSubLabel}>{column.subLabel}</span>
                      )}
                    </span>
                  )}
                  {column.info && (
                    <InfoIcon size={13} className={styles.headerInfo} />
                  )}
                  {column.info && <span className="sr-only">{column.info}</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton columnCount={COLUMNS.length} />
            ) : (
              entries.map((entry) => (
                <TeamMemberRow
                  key={entry.member.id}
                  entry={entry}
                  now={now}
                  onLogoutTimeChange={onLogoutTimeChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && entries.length === 0 && <EmptyState onReset={onResetFilters} />}

      {footer}
    </section>
  )
}
