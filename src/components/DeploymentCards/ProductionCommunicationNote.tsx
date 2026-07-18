import { InfoIcon } from '../icons/Icons'
import styles from './DeploymentCards.module.css'

export function ProductionCommunicationNote() {
  return (
    <section className={styles.noteCard} aria-labelledby="production-note-heading">
      <InfoIcon size={22} className={styles.noteIcon} />
      <div>
        <h2 className={styles.noteHeading} id="production-note-heading">
          Note
        </h2>
        <p className={styles.noteBody}>
          For any communication related to the production timeline, production fix, or
          urgent deployment,{' '}
          <strong className={styles.noteEmphasis}>
            please communicate before 4:00 PM KSA.
          </strong>
          <span className={styles.noteFollowUp}>
            This helps the team plan and provide effective support.
          </span>
        </p>
      </div>
    </section>
  )
}
