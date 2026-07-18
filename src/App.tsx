import { AppHeader } from './components/AppHeader/AppHeader'
import { ViewerLocation } from './components/ViewerLocation/ViewerLocation'
import { SearchFilters } from './components/SearchFilters/SearchFilters'
import { TeamAvailabilityTable } from './components/TeamAvailabilityTable/TeamAvailabilityTable'
import { Pagination } from './components/Pagination/Pagination'
import { DeploymentTimelineCard } from './components/DeploymentCards/DeploymentTimelineCard'
import { ProductionCommunicationNote } from './components/DeploymentCards/ProductionCommunicationNote'
import { CutoffWarning } from './components/CutoffWarning/CutoffWarning'
import { ErrorState } from './components/ErrorState/ErrorState'
import { useCurrentTime } from './hooks/useCurrentTime'
import { useViewerTimeZone } from './hooks/useViewerTimeZone'
import { useTeamMembers } from './hooks/useTeamMembers'
import { useTeamFilters } from './hooks/useTeamFilters'
import { isPastKsaCommunicationCutoff } from './utils/timeZoneUtils'
import { APP_SETTINGS } from './config/settings'
import cardStyles from './components/DeploymentCards/DeploymentCards.module.css'
import styles from './App.module.css'

export function App() {
  // One clock instant drives the header, every row, and the cutoff advisory,
  // so nothing on the page can disagree with anything else.
  const now = useCurrentTime()
  const viewerTimeZone = useViewerTimeZone()
  const { members, isLoading, error, retry, setLogoutTime, saveError } = useTeamMembers()

  const {
    filters,
    setFilters,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    reset,
    paginatedEntries,
    filteredCount,
    totalCount,
    totalPages,
    rangeStart,
    rangeEnd,
    teamOptions,
    roleOptions,
    locationOptions,
  } = useTeamFilters(members, now)

  const pastCutoff = isPastKsaCommunicationCutoff(now)

  return (
    <div className={styles.page}>
      <AppHeader now={now} />

      <ViewerLocation
        now={now}
        timeZone={viewerTimeZone.timeZone}
        detectedTimeZone={viewerTimeZone.detectedTimeZone}
        isOverridden={viewerTimeZone.isOverridden}
        onOverrideChange={viewerTimeZone.setOverride}
        members={members}
      />

      <main className={styles.main}>
        {pastCutoff && <CutoffWarning now={now} />}

        {/* A failed save has already been rolled back in the table; this says
            why the value snapped back. */}
        {saveError && (
          <p className={styles.saveError} role="alert">
            {saveError}
          </p>
        )}

        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={reset}
          teamOptions={teamOptions}
          roleOptions={roleOptions}
          locationOptions={locationOptions}
        />

        {error ? (
          <ErrorState onRetry={retry} detail={error} />
        ) : (
          <TeamAvailabilityTable
            entries={paginatedEntries}
            now={now}
            sort={sort}
            onSortChange={setSort}
            filteredCount={filteredCount}
            totalCount={totalCount}
            isLoading={isLoading}
            onResetFilters={reset}
            onLogoutTimeChange={setLogoutTime}
            footer={
              !isLoading &&
              filteredCount > 0 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  rowsPerPage={rowsPerPage}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalItems={filteredCount}
                  onPageChange={setPage}
                  onRowsPerPageChange={setRowsPerPage}
                />
              )
            }
          />
        )}

        <div className={cardStyles.grid}>
          <DeploymentTimelineCard />
          <ProductionCommunicationNote />
        </div>
      </main>

      {/* Stating the basis for "Online" keeps the product honest: this is a
          schedule view, not an attendance or presence system. */}
      <footer className={styles.footerNote}>
        <p>
          {APP_SETTINGS.applicationName} shows <strong>scheduled</strong> availability.
          Statuses are derived from each team member&apos;s configured working hours and
          time zone — they do not reflect actual login, logout, attendance, or presence.
        </p>
      </footer>
    </div>
  )
}

export default App
