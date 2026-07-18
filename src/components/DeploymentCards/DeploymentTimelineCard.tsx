import { APP_SETTINGS } from '../../config/settings'
import { ClockIcon } from '../icons/Icons'
import styles from './DeploymentCards.module.css'

export function DeploymentTimelineCard() {
  const hours = APP_SETTINGS.productionDeploymentMinimumHours

  return (
    <section className={styles.timelineCard} aria-labelledby="deployment-timeline-heading">
      <ClockIcon size={44} strokeWidth={1.4} className={styles.timelineIcon} />
      <div>
        <h2 className={styles.timelineHeading} id="deployment-timeline-heading">
          Production Deployment Minimum Timeline
        </h2>
        <p className={styles.timelineValue}>{hours} hours</p>
        <p className={styles.timelineNote}>
          Minimum notice required before production deployment.
        </p>
      </div>
    </section>
  )
}
