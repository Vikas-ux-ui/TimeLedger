import { useId, useMemo, useState } from 'react'
import type { MemberAvailability } from '../../types/availability'
import { APP_SETTINGS } from '../../config/settings'
import {
  getExpectedCompletion,
  selectDeploymentReady,
} from '../../utils/deploymentUtils'
import { formatTime } from '../../utils/timeZoneUtils'
import { formatDuration, formatTimeOfDay12h } from '../../utils/formatUtils'
import { CountryFlag } from '../CountryFlag/CountryFlag'
import { ChevronDownIcon, ClockIcon, InfoIcon } from '../icons/Icons'
import styles from './AvailabilitySummary.module.css'

/** How many people the panel shows before it needs expanding. */
const COLLAPSED_COUNT = 3

type AvailabilitySummaryProps = {
  /** Filtered, unpaginated entries — the summary covers every match, not one page. */
  entries: MemberAvailability[]
  now: Date
}

/**
 * Who can still see a production deployment through to completion.
 *
 * Answers one question: if a deployment started now and needed the configured
 * minimum hours, which people would still be inside their working hours when
 * it finished?
 *
 * Everything is derived from the shared `now`, the resolved configuration and
 * the already-filtered entries, so the panel re-computes on its own whenever a
 * filter, a logout time, the configured minimum or the clock changes.
 */
export function AvailabilitySummary({ entries, now }: AvailabilitySummaryProps) {
  const minimumHours = APP_SETTINGS.productionDeploymentMinimumHours
  const listId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  const { expectedCompletion, ready } = useMemo(
    () => ({
      expectedCompletion: getExpectedCompletion(now, minimumHours),
      // Order follows the table's current sort, so the panel agrees with it.
      ready: selectDeploymentReady(entries),
    }),
    [entries, now, minimumHours],
  )

  // Only the first few are shown until the reader asks for the rest; the count
  // in the header always reports the full total.
  const hiddenCount = Math.max(0, ready.length - COLLAPSED_COUNT)
  const visible = isExpanded ? ready : ready.slice(0, COLLAPSED_COUNT)

  return (
    <section className={styles.panel} aria-labelledby="availability-summary-heading">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <ClockIcon size={22} className={styles.titleIcon} />
          <div>
            <h2 className={styles.title} id="availability-summary-heading">
              Available for Deployment
            </h2>
            <p className={styles.subtitle}>
              Still within working hours when a deployment started now would finish.
            </p>
          </div>
        </div>

        <div className={styles.window}>
          <div className={styles.windowItem}>
            <span className={styles.windowLabel}>Now (KSA)</span>
            <span className={styles.windowValue}>
              {formatTime(now, APP_SETTINGS.ksaTimeZone)}
            </span>
          </div>
          <div className={styles.windowItem}>
            <span className={styles.windowLabel}>Minimum window</span>
            <span className={styles.windowValue}>{formatDuration(minimumHours)}</span>
          </div>
          <div className={styles.windowItem}>
            <span className={styles.windowLabel}>Expected completion (KSA)</span>
            <span className={styles.windowValue}>
              {formatTime(expectedCompletion, APP_SETTINGS.ksaTimeZone)}
            </span>
          </div>
          <div className={styles.windowItem}>
            <span className={styles.windowLabel}>Available</span>
            {/* Announced politely so filtering feeds back without stealing focus. */}
            <span className={styles.count} aria-live="polite">
              {ready.length}
            </span>
          </div>
        </div>
      </div>

      {ready.length === 0 ? (
        <div className={styles.empty} role="status">
          <InfoIcon size={26} className={styles.emptyIcon} />
          <p className={styles.emptyMessage}>
            No team members are available for the selected deployment window.
          </p>
          <p className={styles.emptyHint}>
            Nobody matching the current filters is still scheduled to be working at{' '}
            {formatTime(expectedCompletion, APP_SETTINGS.ksaTimeZone)} KSA. Try widening
            the filters, or scheduling the deployment earlier in the day.
          </p>
        </div>
      ) : (
        <ul className={styles.list} id={listId}>
          {visible.map(({ member, availability }) => (
            <li key={member.id} className={styles.member}>
              <div className={styles.memberHead}>
                <CountryFlag countryCode={member.countryCode} />
                <span className={styles.memberName}>{member.name}</span>
                <span className={styles.memberLocation}>({member.locationLabel})</span>
              </div>

              <p className={styles.detail}>
                <span className={styles.detailLabel}>Local Time</span>
                <span className={styles.detailValue}>
                  {formatTime(now, member.timeZone)}
                </span>
              </p>
              <p className={styles.detail}>
                <span className={styles.detailLabel}>Logout</span>
                <span className={styles.detailValue}>
                  {formatTimeOfDay12h(member.workSchedule.endLocal)}
                </span>
              </p>
              {/* The whole point of the panel: the completion instant expressed
                  where this person actually is. */}
              <p className={styles.detail}>
                <span className={styles.detailLabel}>Completes (their time)</span>
                <span className={styles.detailValue}>
                  {formatTime(expectedCompletion, member.timeZone)}
                </span>
              </p>
              <p className={styles.detail}>
                <span className={styles.detailLabel}>Time left today</span>
                <span className={styles.detailValue}>
                  {formatDuration(availability.hoursLeft)}
                </span>
              </p>

              <span className={styles.verdict}>
                <span className={styles.verdictDot} aria-hidden="true" />
                Available for deployment
              </span>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            aria-controls={listId}
          >
            {isExpanded
              ? 'Show less'
              : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'member' : 'members'}`}
            <ChevronDownIcon
              size={15}
              className={`${styles.toggleIcon} ${isExpanded ? styles.toggleIconOpen : ''}`}
            />
          </button>
        </div>
      )}
    </section>
  )
}
