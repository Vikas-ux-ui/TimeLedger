import type { AvailabilityStatus } from '../../types/availability'
import { STATUS_LABELS } from '../../types/availability'
import styles from './StatusBadge.module.css'

type StatusBadgeProps = {
  status: AvailabilityStatus
  /** Extra context surfaced as a native tooltip, e.g. why a schedule failed. */
  title?: string
}

const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  online: styles.online!,
  limited: styles.limited!,
  'starts-soon': styles.startsSoon!,
  offline: styles.offline!,
  'non-working-day': styles.nonWorkingDay!,
  'schedule-unavailable': styles.scheduleUnavailable!,
}

/**
 * Status is always conveyed by its text label. Colour and the dot are
 * reinforcement only, so the meaning survives greyscale and colour blindness.
 */
export function StatusBadge({ status, title }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status]}`} title={title}>
      <span className={styles.dot} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
