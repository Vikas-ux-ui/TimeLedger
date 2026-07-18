import { useCallback, useEffect, useRef, useState } from 'react'
import type { TeamMember } from '../types/teamMember'
import {
  fetchTeamMembers,
  isValidTimeOfDay,
  updateMemberLogoutTime,
} from '../services/teamAvailabilityService'
import { getIdentityKey } from '../utils/identityUtils'

type TeamMembersState = {
  members: TeamMember[]
  isLoading: boolean
  error: string | null
  retry: () => void
  /** Sets a member's scheduled logout time (their local end of day). */
  setLogoutTime: (id: string, endLocal: string) => Promise<void>
  /** Message describing the last failed save, or `null`. */
  saveError: string | null
}

/**
 * Applies an end-of-day time to every record belonging to the same person.
 *
 * A person on several teams has one row per team, and they all describe the
 * same working day, so an edit against any one of them applies to all.
 */
function withEndLocalForIdentity(
  members: TeamMember[],
  identityKey: string,
  endLocal: string,
): TeamMember[] {
  return members.map((member) =>
    getIdentityKey(member) === identityKey
      ? { ...member, workSchedule: { ...member.workSchedule, endLocal } }
      : member,
  )
}

/**
 * Loads the team dataset through the service boundary, exposing the loading and
 * error states the UI needs. Retrying re-runs the request.
 */
export function useTeamMembers(): TeamMembersState {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  /**
   * Mirrors `members` so an edit can read the current value synchronously.
   * Reading it inside a state updater instead would be unreliable: React may
   * defer that updater, and invokes it twice under StrictMode.
   */
  const membersRef = useRef<TeamMember[]>([])

  const applyMembers = useCallback((next: TeamMember[]) => {
    membersRef.current = next
    setMembers(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    fetchTeamMembers()
      .then((items) => {
        if (cancelled) return
        applyMembers(items)
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Unknown error')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [attempt, applyMembers])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  /**
   * Applies the new logout time locally first so the table responds
   * immediately, then persists. If persistence is refused the row is put back
   * to its previous value rather than left showing something that was not
   * saved.
   */
  const setLogoutTime = useCallback(
    async (id: string, endLocal: string) => {
      if (!isValidTimeOfDay(endLocal)) {
        setSaveError(`"${endLocal}" is not a valid time.`)
        return
      }

      const target = membersRef.current.find((member) => member.id === id)
      if (target === undefined) return

      const previous = target.workSchedule.endLocal
      if (previous === endLocal) return

      // Every membership this person holds moves together.
      const identityKey = getIdentityKey(target)

      applyMembers(withEndLocalForIdentity(membersRef.current, identityKey, endLocal))
      setSaveError(null)

      try {
        await updateMemberLogoutTime(target, endLocal)
      } catch (cause) {
        applyMembers(withEndLocalForIdentity(membersRef.current, identityKey, previous))
        setSaveError(
          cause instanceof Error
            ? `Logout time could not be saved — ${cause.message}`
            : 'Logout time could not be saved.',
        )
      }
    },
    [applyMembers],
  )

  return { members, isLoading, error, retry, setLogoutTime, saveError }
}
