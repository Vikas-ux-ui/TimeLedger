import { useEffect, useState } from 'react'

/**
 * Whether this viewer reads times on a 12-hour clock.
 *
 * Resolved from the runtime's own locale data rather than a hardcoded default,
 * so a viewer on a 24-hour locale never sees AM/PM and vice versa.
 */
export function detectHour12(): boolean {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
    }).resolvedOptions()

    // `hour12` is the direct answer where the runtime provides it.
    if (typeof resolved.hour12 === 'boolean') return resolved.hour12

    // Otherwise derive it from the hour cycle: h11/h12 are the 12-hour ones.
    return resolved.hourCycle === 'h11' || resolved.hourCycle === 'h12'
  } catch {
    // A runtime without usable locale data falls back to the 24-hour form,
    // which is unambiguous.
    return false
  }
}

/**
 * Tracks the viewer's 12/24-hour preference.
 *
 * Browsers expose no event for "the OS clock setting changed", but they do fire
 * `languagechange` when the preferred locales change, which is the signal that
 * carries a clock-format change in practice. Anything beyond that is picked up
 * on the next load.
 */
export function useTimeFormatPreference(): boolean {
  const [hour12, setHour12] = useState<boolean>(() => detectHour12())

  useEffect(() => {
    const handleLanguageChange = () => setHour12(detectHour12())
    window.addEventListener('languagechange', handleLanguageChange)
    return () => window.removeEventListener('languagechange', handleLanguageChange)
  }, [])

  return hour12
}
