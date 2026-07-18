import { useCallback, useMemo, useState } from 'react'
import { detectViewerTimeZone, isValidTimeZone } from '../utils/timeZoneUtils'

export type ViewerTimeZoneState = {
  /** The zone actually in effect — the override when set, else the detection. */
  timeZone: string
  /** What the browser reported, regardless of any override. */
  detectedTimeZone: string
  /** The manual selection, or `null` when following the browser. */
  override: string | null
  setOverride: (timeZone: string | null) => void
  isOverridden: boolean
}

/**
 * Resolves the viewer's time zone from the browser, with a manual override.
 *
 * Detection is synchronous and never blocks rendering. We deliberately do not
 * request geolocation: the IANA zone is enough for the times shown here, and a
 * denied permission prompt must never degrade the page. A zone also cannot
 * identify a city or country on its own, so we never claim that it does.
 */
export function useViewerTimeZone(): ViewerTimeZoneState {
  const detectedTimeZone = useMemo(() => detectViewerTimeZone(), [])
  const [override, setOverrideState] = useState<string | null>(null)

  const setOverride = useCallback((timeZone: string | null) => {
    if (timeZone === null) {
      setOverrideState(null)
      return
    }
    if (isValidTimeZone(timeZone)) setOverrideState(timeZone)
  }, [])

  return {
    timeZone: override ?? detectedTimeZone,
    detectedTimeZone,
    override,
    setOverride,
    isOverridden: override !== null,
  }
}
