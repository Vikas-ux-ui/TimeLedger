import { useCallback, useEffect, useState } from 'react'
import type { TeamMember } from '../types/teamMember'
import { fetchTeamMembers } from '../services/teamAvailabilityService'

type TeamMembersState = {
  members: TeamMember[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

/**
 * Loads the team dataset through the service boundary, exposing the loading and
 * error states the UI needs. Retrying re-runs the request.
 */
export function useTeamMembers(): TeamMembersState {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    fetchTeamMembers()
      .then((items) => {
        if (cancelled) return
        setMembers(items)
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
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return { members, isLoading, error, retry }
}
