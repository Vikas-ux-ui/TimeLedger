import { useEffect, useId, useRef, useState } from 'react'
import type { AvailabilityStatus } from '../../types/availability'
import { STATUS_LABELS } from '../../types/availability'
import {
  countAdvancedFilters,
  type TeamFilterState,
} from '../../utils/filterUtils'
import { APP_SETTINGS } from '../../config/settings'
import { FilterIcon, ResetIcon, SearchIcon } from '../icons/Icons'
import styles from './SearchFilters.module.css'

type SearchFiltersProps = {
  filters: TeamFilterState
  onFiltersChange: (updates: Partial<TeamFilterState>) => void
  onReset: () => void
  teamOptions: string[]
  roleOptions: string[]
  locationOptions: string[]
}

const ALL = '__all__'

const STATUS_ORDER: AvailabilityStatus[] = [
  'online',
  'limited',
  'starts-soon',
  'offline',
  'non-working-day',
  'schedule-unavailable',
]

const DEPLOYMENT_MINIMUM = APP_SETTINGS.productionDeploymentMinimumHours

const MINIMUM_HOURS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '2', label: '2+ hours' },
  // Mirrors the production deployment minimum, so the shortcut cannot drift
  // away from the threshold the rest of the page enforces.
  { value: String(DEPLOYMENT_MINIMUM), label: `${DEPLOYMENT_MINIMUM}+ hours` },
  { value: '8', label: '8+ hours' },
  { value: '10', label: '10+ hours' },
]

/**
 * The dropdowns are single-select for a clean business UI, while the underlying
 * state stays an array so a future multi-select (or API `?team=a&team=b`) needs
 * no state change.
 */
function toSingleValue(values: string[]): string {
  return values.length === 1 ? values[0]! : ALL
}

export function SearchFilters({
  filters,
  onFiltersChange,
  onReset,
  teamOptions,
  roleOptions,
  locationOptions,
}: SearchFiltersProps) {
  const searchId = useId()
  const teamId = useId()
  const roleId = useId()
  const locationId = useId()
  const popoverId = useId()

  const [isPopoverOpen, setPopoverOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  const advancedCount = countAdvancedFilters(filters)

  // Dismiss the popover on outside click or Escape, returning focus to the
  // trigger so keyboard users are never stranded.
  useEffect(() => {
    if (!isPopoverOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setPopoverOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPopoverOpen(false)
        moreButtonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPopoverOpen])

  const handleSelect = (key: 'teams' | 'roles' | 'locations', value: string) => {
    onFiltersChange({ [key]: value === ALL ? [] : [value] })
  }

  const toggleStatus = (status: AvailabilityStatus) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ statuses: next })
  }

  return (
    <section className={styles.panel} aria-label="Search and filter team members">
      <div className={styles.row}>
        <div className={styles.searchField}>
          <label className="sr-only" htmlFor={searchId}>
            Search team members
          </label>
          <div className={styles.searchWrapper}>
            <SearchIcon size={18} className={styles.searchIcon} />
            <input
              id={searchId}
              type="search"
              className={styles.searchInput}
              placeholder="Search by name, team, role, location or keyword..."
              value={filters.search}
              onChange={(event) => onFiltersChange({ search: event.target.value })}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={teamId}>
            Team
          </label>
          <select
            id={teamId}
            className={styles.select}
            value={toSingleValue(filters.teams)}
            onChange={(event) => handleSelect('teams', event.target.value)}
          >
            <option value={ALL}>All Teams</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={roleId}>
            Role
          </label>
          <select
            id={roleId}
            className={styles.select}
            value={toSingleValue(filters.roles)}
            onChange={(event) => handleSelect('roles', event.target.value)}
          >
            <option value={ALL}>All Roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={locationId}>
            Location
          </label>
          <select
            id={locationId}
            className={styles.select}
            value={toSingleValue(filters.locations)}
            onChange={(event) => handleSelect('locations', event.target.value)}
          >
            <option value={ALL}>All Locations</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions} ref={actionsRef}>
          <button
            type="button"
            ref={moreButtonRef}
            className={`${styles.moreButton} ${
              advancedCount > 0 ? styles.moreButtonActive : ''
            }`}
            onClick={() => setPopoverOpen((open) => !open)}
            aria-expanded={isPopoverOpen}
            aria-controls={popoverId}
          >
            <FilterIcon size={16} />
            More Filters
            {advancedCount > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {advancedCount}
              </span>
            )}
            {advancedCount > 0 && (
              <span className="sr-only">{advancedCount} advanced filters active</span>
            )}
          </button>

          <button type="button" className={styles.resetButton} onClick={onReset}>
            <ResetIcon size={16} />
            Reset
          </button>

          {isPopoverOpen && (
            <div
              id={popoverId}
              className={styles.popover}
              role="dialog"
              aria-label="More filters"
            >
              <p className={styles.popoverTitle}>More Filters</p>

              <fieldset className={styles.group}>
                <legend className={styles.groupLegend}>Status</legend>
                <div className={styles.statusGrid}>
                  {STATUS_ORDER.map((status) => (
                    <label key={status} className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                      />
                      {STATUS_LABELS[status]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.group}>
                <label className={styles.groupLegend} htmlFor={`${popoverId}-hours`}>
                  Minimum hours left
                </label>
                <select
                  id={`${popoverId}-hours`}
                  className={styles.select}
                  value={filters.minimumHoursLeft?.toString() ?? ''}
                  onChange={(event) =>
                    onFiltersChange({
                      minimumHoursLeft:
                        event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                >
                  {MINIMUM_HOURS_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.group}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={filters.deploymentEligibleOnly}
                    onChange={(event) =>
                      onFiltersChange({ deploymentEligibleOnly: event.target.checked })
                    }
                  />
                  Available for production deployment
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={filters.withinWorkingHoursOnly}
                    onChange={(event) =>
                      onFiltersChange({ withinWorkingHoursOnly: event.target.checked })
                    }
                  />
                  Currently within working hours
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={filters.sharedOnly}
                    onChange={(event) =>
                      onFiltersChange({ sharedOnly: event.target.checked })
                    }
                  />
                  Shared team members only
                </label>
              </div>

              <div className={styles.popoverFooter}>
                <button
                  type="button"
                  className={styles.popoverClear}
                  onClick={() =>
                    onFiltersChange({
                      statuses: [],
                      minimumHoursLeft: null,
                      deploymentEligibleOnly: false,
                      withinWorkingHoursOnly: false,
                      sharedOnly: false,
                    })
                  }
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={styles.popoverDone}
                  onClick={() => {
                    setPopoverOpen(false)
                    moreButtonRef.current?.focus()
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
