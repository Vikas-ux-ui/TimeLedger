import { useId, useMemo } from 'react'
import type { TeamMember } from '../../types/teamMember'
import { APP_SETTINGS } from '../../config/settings'
import { describeTimeZone, formatTime } from '../../utils/timeZoneUtils'
import { GlobeIcon } from '../icons/Icons'
import styles from './ViewerLocation.module.css'

type ViewerLocationProps = {
  now: Date
  timeZone: string
  detectedTimeZone: string
  isOverridden: boolean
  onOverrideChange: (timeZone: string | null) => void
  members: TeamMember[]
}

export function ViewerLocation({
  now,
  timeZone,
  detectedTimeZone,
  isOverridden,
  onOverrideChange,
  members,
}: ViewerLocationProps) {
  const selectId = useId()

  // Offer every zone represented in the dataset, plus KSA and whatever the
  // browser reported, so the viewer can preview any team's perspective.
  const zoneOptions = useMemo(() => {
    const zones = new Set<string>([
      APP_SETTINGS.ksaTimeZone,
      detectedTimeZone,
      ...members.map((member) => member.timeZone),
    ])
    return [...zones].sort((a, b) => a.localeCompare(b))
  }, [detectedTimeZone, members])

  return (
    <div className={styles.bar}>
      <GlobeIcon size={15} className={styles.icon} />
      <span className={styles.text}>
        {/* A time zone identifies a region, not a city or country, so the
            wording stays deliberately non-committal about where you are. */}
        <span>
          Viewing in <strong>{describeTimeZone(timeZone)}</strong> time
        </span>
        <span aria-hidden="true">—</span>
        <span>{timeZone}</span>
        <span aria-hidden="true">—</span>
        <span className={styles.time}>{formatTime(now, timeZone)}</span>
        {isOverridden && <span>(manually selected)</span>}
      </span>

      <div className={styles.overrideGroup}>
        <label className={styles.label} htmlFor={selectId}>
          Time zone
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={timeZone}
          onChange={(event) => onOverrideChange(event.target.value)}
        >
          {zoneOptions.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
              {zone === detectedTimeZone ? ' (detected)' : ''}
            </option>
          ))}
        </select>
        {isOverridden && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => onOverrideChange(null)}
          >
            Use detected
          </button>
        )}
      </div>
    </div>
  )
}
