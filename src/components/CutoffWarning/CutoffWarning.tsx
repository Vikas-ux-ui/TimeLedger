import { APP_SETTINGS } from '../../config/settings'
import { formatTime } from '../../utils/timeZoneUtils'
import { WarningIcon } from '../icons/Icons'
import styles from './CutoffWarning.module.css'

type CutoffWarningProps = {
  now: Date
}

/**
 * Advisory banner shown once KSA local time passes the preferred communication
 * cutoff. It is guidance only — it never hides data or blocks any action.
 */
export function CutoffWarning({ now }: CutoffWarningProps) {
  return (
    <div className={styles.banner} role="status">
      <WarningIcon size={20} className={styles.icon} />
      <p className={styles.text}>
        <span className={styles.strong}>
          The preferred 4:00 PM KSA communication window has passed.
        </span>{' '}
        It is currently {formatTime(now, APP_SETTINGS.ksaTimeZone)} KSA. Requests for a
        production timeline, production fix, or urgent deployment may not get effective
        support today.
        <span className={styles.hint}>
          This is advisory guidance. All team data below remains available.
        </span>
      </p>
    </div>
  )
}
