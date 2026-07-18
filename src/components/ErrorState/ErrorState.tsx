import { WarningIcon } from '../icons/Icons'
import styles from '../EmptyState/EmptyState.module.css'

type ErrorStateProps = {
  onRetry: () => void
  /** Underlying cause, shown as supporting detail when available. */
  detail?: string
}

export function ErrorState({ onRetry, detail }: ErrorStateProps) {
  return (
    <div className={styles.wrapper} role="alert">
      <WarningIcon size={28} className={styles.errorIcon} />
      <p className={styles.message}>
        Team availability could not be loaded. Please try again.
      </p>
      {detail && <p className={styles.hint}>{detail}</p>}
      <button type="button" className={styles.button} onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
