import { useId, useState } from 'react'
import type { TeamMember } from '../../types/teamMember'
import { isValidTimeOfDay } from '../../services/teamAvailabilityService'
import { formatTimeOfDay12h } from '../../utils/formatUtils'
import styles from './LogoutTimeEditor.module.css'

type LogoutTimeEditorProps = {
  member: TeamMember
  /** Commits a new local end-of-day time for this member. */
  onChange: (id: string, endLocal: string) => void
  /** Disabled while the schedule cannot be interpreted. */
  disabled?: boolean
}

/**
 * Editable scheduled logout time — the end of a member's working day, in their
 * own time zone.
 *
 * Uses a native `time` input: it gives a real picker, is keyboard accessible,
 * renders in the viewer's 12/24-hour convention, and its value format is
 * already the `HH:mm` the schedule model stores.
 *
 * This is a *scheduled* logout, not an observed one. Nothing here claims the
 * person actually signed out at this time.
 */
export function LogoutTimeEditor({
  member,
  onChange,
  disabled = false,
}: LogoutTimeEditorProps) {
  const inputId = useId()
  const stored = member.workSchedule.endLocal

  // The draft is only in play while the field has focus. Once it blurs the
  // input renders `stored` again, so it always reflects the saved schedule —
  // including when a rejected save is rolled back to the previous value.
  const [draft, setDraft] = useState(stored)
  const [isEditing, setIsEditing] = useState(false)
  const [isInvalid, setIsInvalid] = useState(false)

  const commit = (value: string) => {
    setIsEditing(false)

    // Clearing the field means "no change": the native control empties itself
    // mid-edit on some browsers, which must not wipe a schedule.
    if (value === '') {
      setIsInvalid(false)
      return
    }
    if (!isValidTimeOfDay(value)) {
      setIsInvalid(true)
      return
    }
    setIsInvalid(false)
    if (value !== stored) onChange(member.id, value)
  }

  return (
    <div className={styles.wrapper}>
      <label className="sr-only" htmlFor={inputId}>
        Scheduled logout time for {member.name}, local time
      </label>
      <input
        id={inputId}
        type="time"
        className={`${styles.input} ${isInvalid ? styles.inputInvalid : ''}`}
        value={isEditing ? draft : stored}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        onFocus={() => {
          setDraft(stored)
          setIsEditing(true)
        }}
        onChange={(event) => setDraft(event.target.value)}
        // Commit on blur and on Enter rather than per keystroke, so a partially
        // typed time never gets written to the schedule.
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            setDraft(stored)
            setIsInvalid(false)
            setIsEditing(false)
          }
        }}
      />
      {isInvalid ? (
        <span className={`${styles.message} ${styles.messageError}`} role="alert">
          Enter a valid time.
        </span>
      ) : (
        // A native time input renders 12- or 24-hour depending on the viewer's
        // locale. This caption states the intended reading unambiguously.
        <span className={styles.message}>{formatTimeOfDay12h(stored)}</span>
      )}
    </div>
  )
}
