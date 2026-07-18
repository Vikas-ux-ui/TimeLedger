import { SearchIcon } from '../icons/Icons'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  onReset: () => void
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className={styles.wrapper} role="status">
      <SearchIcon size={28} className={styles.icon} />
      <p className={styles.message}>No team members match the selected filters.</p>
      <p className={styles.hint}>
        Try a different search term, or widen the team, role and location filters.
      </p>
      <button type="button" className={styles.button} onClick={onReset}>
        Reset filters
      </button>
    </div>
  )
}
