/**
 * Presentation-only helpers. Nothing here performs time-zone maths.
 */

/** `8.5` -> `8h 30m`. Never renders a negative duration. */
export function formatDuration(hours: number): string {
  const safe = Math.max(0, hours)
  const totalMinutes = Math.round(safe * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Screen-reader friendly duration, e.g. `8 hours 30 minutes`. */
export function formatDurationLong(hours: number): string {
  const safe = Math.max(0, hours)
  const totalMinutes = Math.round(safe * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  return parts.length > 0 ? parts.join(' ') : '0 minutes'
}

/** `Lexi Addams` -> `LA`. Falls back to a single character. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
}

/**
 * Deterministic avatar tint so a given person keeps the same colour between
 * renders and pages. Purely decorative — never used to convey status.
 */
export function getAvatarPaletteIndex(seed: string, paletteSize: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % paletteSize
}
