import { useEffect, useState } from 'react'
import { CLOCK_TICK_MS } from '../config/settings'

/**
 * One shared clock for the whole page.
 *
 * Every row derives its times from this single instant, so all rows stay
 * consistent with each other and only one timer exists regardless of how many
 * team members are rendered.
 */
export function useCurrentTime(intervalMs: number = CLOCK_TICK_MS): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
