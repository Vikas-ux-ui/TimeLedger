import { APP_SETTINGS } from '../../config/settings'
import { formatLongDate, formatTime } from '../../utils/timeZoneUtils'
import { ChevronDownIcon, ClockIcon } from '../icons/Icons'
import logoUrl from '../../assets/logo.png'
import styles from './AppHeader.module.css'

type AppHeaderProps = {
  /** The shared page instant; the KSA clock re-renders whenever this ticks. */
  now: Date
}

export function AppHeader({ now }: AppHeaderProps) {
  const ksaTime = formatTime(now, APP_SETTINGS.ksaTimeZone)
  const ksaDate = formatLongDate(now, APP_SETTINGS.ksaTimeZone)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* The heading is kept for document structure; the alt text carries
              the brand name so the accessible name is unchanged by the swap. */}
          <h1 className={styles.brandName}>
            <img
              src={logoUrl}
              alt={APP_SETTINGS.applicationName}
              className={styles.brandLogo}
              width={1873}
              height={452}
            />
          </h1>
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.titleBlock}>
            <p className={styles.title}>{APP_SETTINGS.pageTitle}</p>
            <p className={styles.subtitle}>{APP_SETTINGS.pageSubtitle}</p>
          </div>
        </div>

        <div className={styles.rightCluster}>
          <div className={styles.ksaCard}>
            <ClockIcon size={28} className={styles.ksaIcon} />
            <div>
              <p className={styles.ksaLabel} id="ksa-clock-label">
                KSA Current Time
              </p>
              {/* The clock updates on its own, so announce it politely rather
                  than interrupting whatever the user is doing. */}
              <p
                className={styles.ksaTime}
                aria-labelledby="ksa-clock-label"
                aria-live="polite"
              >
                {ksaTime}
              </p>
              <p className={styles.ksaDate}>{ksaDate}</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.user}
            aria-label="Business Owner account menu"
          >
            <span className={styles.avatar} aria-hidden="true">
              BO
            </span>
            <span className={styles.userLabel}>Business Owner</span>
            <ChevronDownIcon size={14} className={styles.userChevron} />
          </button>
        </div>
      </div>
    </header>
  )
}
