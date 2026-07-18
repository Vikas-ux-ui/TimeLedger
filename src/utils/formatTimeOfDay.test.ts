import { describe, expect, it } from 'vitest'
import { formatTimeOfDay } from './formatUtils'
import { detectHour12 } from '../hooks/useTimeFormatPreference'

/**
 * The stored value is always 24-hour `HH:mm`; only the rendering follows the
 * viewer's clock preference. Assertions use regular expressions because the
 * separator and digit shapes belong to the locale, not to this code.
 */

describe('formatTimeOfDay on a 12-hour clock', () => {
  const twelve = (value: string) => formatTimeOfDay(value, true)

  it('shows a day period', () => {
    expect(twelve('13:00')).toMatch(/\b(AM|PM)\b/)
    expect(twelve('08:45')).toMatch(/\b(AM|PM)\b/)
  })

  it('maps afternoon hours onto the 12-hour dial', () => {
    expect(twelve('13:00')).toMatch(/\b01[:.]00\b.*PM/)
    expect(twelve('20:30')).toMatch(/\b08[:.]30\b.*PM/)
    expect(twelve('23:59')).toMatch(/\b11[:.]59\b.*PM/)
  })

  it('renders morning hours with AM', () => {
    expect(twelve('08:45')).toMatch(/\b08[:.]45\b.*AM/)
    expect(twelve('10:30')).toMatch(/\b10[:.]30\b.*AM/)
  })

  it('renders midnight as 12 AM rather than 00 or 24', () => {
    expect(twelve('00:15')).toMatch(/\b12[:.]15\b.*AM/)
  })

  it('uppercases the day period even where the locale lowercases it', () => {
    expect(twelve('13:00')).not.toMatch(/\b(am|pm)\b/)
  })
})

describe('formatTimeOfDay on a 24-hour clock', () => {
  const twentyFour = (value: string) => formatTimeOfDay(value, false)

  it('never shows a day period', () => {
    for (const value of ['13:00', '22:30', '08:45', '00:15', '23:59']) {
      expect(twentyFour(value)).not.toMatch(/AM|PM/i)
    }
  })

  it('keeps the 24-hour reading', () => {
    expect(twentyFour('13:00')).toMatch(/\b13[:.]00\b/)
    expect(twentyFour('22:30')).toMatch(/\b22[:.]30\b/)
    expect(twentyFour('08:45')).toMatch(/\b08[:.]45\b/)
  })

  it('renders midnight as 00, never 24', () => {
    expect(twentyFour('00:15')).toMatch(/\b00[:.]15\b/)
    expect(twentyFour('00:15')).not.toMatch(/\b24[:.]/)
  })
})

describe('formatTimeOfDay robustness', () => {
  it('returns malformed input untouched rather than inventing a time', () => {
    expect(formatTimeOfDay('', true)).toBe('')
    expect(formatTimeOfDay('nonsense', true)).toBe('nonsense')
    expect(formatTimeOfDay('25:00', true)).toBe('25:00')
    expect(formatTimeOfDay('12:75', true)).toBe('12:75')
  })

  it('produces different output for the two clock settings', () => {
    expect(formatTimeOfDay('13:00', true)).not.toBe(formatTimeOfDay('13:00', false))
  })
})

describe('detectHour12', () => {
  it('reports a boolean derived from the runtime locale, not a constant', () => {
    const detected = detectHour12()
    expect(typeof detected).toBe('boolean')

    // Whatever it reports must agree with what Intl itself resolves.
    const resolved = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
    }).resolvedOptions()
    const expected =
      typeof resolved.hour12 === 'boolean'
        ? resolved.hour12
        : resolved.hourCycle === 'h11' || resolved.hourCycle === 'h12'

    expect(detected).toBe(expected)
  })
})
