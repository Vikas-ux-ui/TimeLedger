import type { MemberAvailability } from '../../types/availability'
import { APP_SETTINGS } from '../../config/settings'
import {
  formatShortDate,
  formatTime,
  formatTimeRange,
} from '../../utils/timeZoneUtils'
import {
  formatDuration,
  formatDurationLong,
  getAvatarPaletteIndex,
  getInitials,
} from '../../utils/formatUtils'
import { CountryFlag } from '../CountryFlag/CountryFlag'
import { StatusBadge } from '../StatusBadge/StatusBadge'
import { MoreIcon } from '../icons/Icons'
import styles from '../TeamAvailabilityTable/TeamAvailabilityTable.module.css'

type TeamMemberRowProps = {
  entry: MemberAvailability
  now: Date
}

/** Decorative avatar tints. Never used to encode status. */
const AVATAR_COLORS = [
  { bg: '#e8eef7', fg: '#3b5f8a' },
  { bg: '#eaf3ec', fg: '#3d6b4a' },
  { bg: '#f6ecec', fg: '#8a4a4a' },
  { bg: '#f2eef7', fg: '#5f4a80' },
  { bg: '#fdf2e3', fg: '#8a6320' },
  { bg: '#e6f2f4', fg: '#2f6670' },
]

export function TeamMemberRow({ entry, now }: TeamMemberRowProps) {
  const { member, availability } = entry
  const {
    status,
    hoursLeft,
    elapsedHours,
    startsInHours,
    localWorkStart,
    localWorkEnd,
    ksaWorkStart,
    ksaWorkEnd,
    deploymentEligible,
    isWithinWorkingHours,
    scheduleIssue,
  } = availability

  const hasSchedule = localWorkStart !== null && localWorkEnd !== null
  const isWorkingDay = status !== 'non-working-day' && status !== 'schedule-unavailable'
  const palette = AVATAR_COLORS[getAvatarPaletteIndex(member.id, AVATAR_COLORS.length)]!

  const shiftHours =
    hasSchedule && localWorkStart && localWorkEnd
      ? (localWorkEnd.getTime() - localWorkStart.getTime()) / 3_600_000
      : 0
  const progressPercent =
    shiftHours > 0 ? Math.min(100, Math.max(0, (hoursLeft / shiftHours) * 100)) : 0

  const hoursClass =
    hoursLeft <= 0
      ? styles.hoursNone
      : deploymentEligible
        ? styles.hoursOnline
        : styles.hoursLimited

  return (
    <tr tabIndex={0}>
      <td data-label="Team Member">
        <div className={styles.memberCell}>
          <span
            className={styles.avatar}
            style={{ backgroundColor: palette.bg, color: palette.fg }}
            aria-hidden="true"
          >
            {getInitials(member.name)}
          </span>
          <div>
            <div className={styles.memberName}>{member.name}</div>
            <div className={styles.memberRole} title={member.role}>
              {member.role}
            </div>
          </div>
        </div>
      </td>

      <td data-label="Team">
        <div className={styles.teamCell}>
          <span>{member.team}</span>
          {member.isShared && (
            <span
              className={styles.sharedTag}
              title={`${member.name} works across more than one team`}
            >
              Shared
            </span>
          )}
        </div>
      </td>

      <td data-label="Location">
        <div className={styles.locationCell}>
          <CountryFlag countryCode={member.countryCode} className={styles.flag} />
          <span className={styles.locationLabel}>{member.locationLabel}</span>
        </div>
      </td>

      <td data-label="Local Time">
        {status === 'schedule-unavailable' ? (
          <span className={styles.unscheduled}>—</span>
        ) : (
          <>
            <div className={styles.primaryLine}>{formatTime(now, member.timeZone)}</div>
            <div className={styles.secondaryLine}>
              {formatShortDate(now, member.timeZone)}
            </div>
          </>
        )}
      </td>

      <td data-label="Local Working Hours">
        {!hasSchedule ? (
          <span className={styles.unscheduled}>Schedule unavailable</span>
        ) : !isWorkingDay ? (
          <span className={styles.unscheduled}>Not scheduled today</span>
        ) : (
          <>
            <div className={styles.rangeLine}>
              {formatTimeRange(localWorkStart, localWorkEnd, member.timeZone, {
                annotateDayShift: true,
              })}
            </div>
            <div className={styles.secondaryLine}>
              {isWithinWorkingHours
                ? `${formatDuration(elapsedHours)} elapsed`
                : startsInHours !== null
                  ? `Starts in ${formatDuration(startsInHours)}`
                  : 'Shift ended'}
            </div>
          </>
        )}
      </td>

      <td data-label="KSA Current Time">
        <div className={styles.primaryLine}>
          {formatTime(now, APP_SETTINGS.ksaTimeZone)}
        </div>
        <div className={styles.secondaryLine}>
          {formatShortDate(now, APP_SETTINGS.ksaTimeZone)}
        </div>
      </td>

      {/* The member's full local shift, re-expressed in KSA time. This is a
          converted range — never an elapsed duration. */}
      <td data-label="Working Hours in KSA">
        {!hasSchedule || !ksaWorkStart || !ksaWorkEnd ? (
          <span className={styles.unscheduled}>—</span>
        ) : !isWorkingDay ? (
          <span className={styles.unscheduled}>Not scheduled today</span>
        ) : (
          <div className={styles.rangeLine}>
            {formatTimeRange(ksaWorkStart, ksaWorkEnd, APP_SETTINGS.ksaTimeZone, {
              annotateDayShift: true,
            })}{' '}
            <span className={styles.ksaSuffix}>KSA</span>
          </div>
        )}
      </td>

      <td data-label="Hours Left for the Day">
        {status === 'schedule-unavailable' ? (
          <span className={styles.unscheduled}>—</span>
        ) : (
          <div className={hoursClass}>
            <div className={styles.hoursLeftValue}>
              <span aria-hidden="true">{formatDuration(hoursLeft)}</span>
              <span className="sr-only">
                {formatDurationLong(hoursLeft)} of scheduled time left
              </span>
            </div>
            {hoursLeft > 0 && (
              <div className={styles.progressTrack} aria-hidden="true">
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
            {isWithinWorkingHours && (
              <span
                className={`${styles.deploymentHint} ${
                  deploymentEligible ? styles.deploymentEligible : styles.deploymentBlocked
                }`}
                title={
                  deploymentEligible
                    ? `At least ${APP_SETTINGS.productionDeploymentMinimumHours} hours remain, so there is room for a production deployment.`
                    : `Less than ${APP_SETTINGS.productionDeploymentMinimumHours} hours remain in this shift.`
                }
              >
                {deploymentEligible
                  ? 'Deployment window OK'
                  : 'Insufficient deployment window'}
              </span>
            )}
          </div>
        )}
      </td>

      <td data-label="Status">
        <StatusBadge
          status={status}
          title={
            scheduleIssue ??
            (startsInHours !== null
              ? `Starts in ${formatDuration(startsInHours)}`
              : undefined)
          }
        />
      </td>

      <td data-label="Actions" className={styles.actionsCell}>
        <button
          type="button"
          className={styles.actionButton}
          aria-label={`Actions for ${member.name}`}
          title="More actions (coming soon)"
        >
          <MoreIcon size={18} />
        </button>
      </td>
    </tr>
  )
}
