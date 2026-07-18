import { describe, expect, it } from 'vitest'
import {
  canonicalizeTimeZone,
  formatShortDate,
  formatTime,
  formatTimeRange,
  isPastKsaCommunicationCutoff,
  isValidTimeZone,
  parseTimeOfDay,
} from './timeZoneUtils'
import { INSTANTS } from '../test/factories'

describe('timeZoneUtils', () => {
  // Required test 1
  it('formats KSA time using Asia/Riyadh', () => {
    // 09:00 UTC is 12:00 in Riyadh (UTC+3).
    expect(formatTime(INSTANTS.mondayMidShiftIst, 'Asia/Riyadh')).toBe('12:00 PM')
    expect(formatShortDate(INSTANTS.mondayMidShiftIst, 'Asia/Riyadh')).toBe('Mon, Jul 20')
  })

  // Required test 2
  it('formats employee local time using the employee time zone', () => {
    // The same instant is 14:30 in Kolkata (UTC+5:30).
    expect(formatTime(INSTANTS.mondayMidShiftIst, 'Asia/Kolkata')).toBe('2:30 PM')
    // ...and 04:00 in Chicago (UTC-5 in July).
    expect(formatTime(INSTANTS.mondayMidShiftIst, 'America/Chicago')).toBe('4:00 AM')
  })

  it('renders a time range in the requested zone', () => {
    const start = new Date('2026-07-20T03:30:00Z')
    const end = new Date('2026-07-20T17:30:00Z')
    expect(formatTimeRange(start, end, 'Asia/Riyadh')).toBe('6:30 AM – 8:30 PM')
  })

  it('annotates a range that crosses midnight in the target zone', () => {
    // 09:00-23:00 in Los Angeles lands on the next day once shown in Riyadh.
    const start = new Date('2026-07-20T16:00:00Z') // 09:00 PDT
    const end = new Date('2026-07-21T06:00:00Z') // 23:00 PDT
    expect(formatTimeRange(start, end, 'Asia/Riyadh', { annotateDayShift: true })).toBe(
      '7:00 PM – 9:00 AM (+1d)',
    )
  })

  it('validates IANA time zones and rejects junk', () => {
    expect(isValidTimeZone('Asia/Riyadh')).toBe(true)
    expect(isValidTimeZone('America/Los_Angeles')).toBe(true)
    expect(isValidTimeZone('Not/AZone')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone(undefined)).toBe(false)
  })

  it('canonicalizes legacy zone aliases so the same zone is not listed twice', () => {
    // Windows commonly reports India as the deprecated Asia/Calcutta.
    expect(canonicalizeTimeZone('Asia/Calcutta')).toBe('Asia/Kolkata')
    expect(canonicalizeTimeZone('Europe/Kiev')).toBe('Europe/Kyiv')
    // Canonical and unknown ids pass through untouched.
    expect(canonicalizeTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata')
    expect(canonicalizeTimeZone('Asia/Riyadh')).toBe('Asia/Riyadh')
  })

  it('parses HH:mm and rejects malformed values', () => {
    expect(parseTimeOfDay('09:00')).toEqual({ hour: 9, minute: 0 })
    expect(parseTimeOfDay('23:30')).toEqual({ hour: 23, minute: 30 })
    expect(parseTimeOfDay('9:5')).toBeNull()
    expect(parseTimeOfDay('24:00')).toBeNull()
    expect(parseTimeOfDay('nine')).toBeNull()
    expect(parseTimeOfDay(undefined)).toBeNull()
  })

  // Required test 15 (rule half)
  it('detects the 4:00 PM KSA communication cutoff', () => {
    // 12:00 KSA — still inside the preferred window.
    expect(isPastKsaCommunicationCutoff(INSTANTS.ksaBeforeCutoff)).toBe(false)
    // 17:00 KSA — past it.
    expect(isPastKsaCommunicationCutoff(INSTANTS.ksaAfterCutoff)).toBe(true)
    // Exactly 16:00 KSA counts as passed.
    expect(isPastKsaCommunicationCutoff(new Date('2026-07-20T13:00:00Z'))).toBe(true)
  })
})
