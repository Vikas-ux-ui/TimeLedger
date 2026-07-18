import { describe, expect, it } from 'vitest'
import { computeAvailability } from './availabilityUtils'
import { formatTimeRange } from './timeZoneUtils'
import { INSTANTS, makeMember } from '../test/factories'
import { APP_SETTINGS } from '../config/settings'

const indiaMember = makeMember()
const DEPLOYMENT_MINIMUM = APP_SETTINGS.productionDeploymentMinimumHours

describe('computeAvailability', () => {
  // Required test 3
  it('converts a local shift into the correct KSA range', () => {
    const result = computeAvailability(indiaMember, INSTANTS.mondayMidShiftIst)

    // 09:00–23:00 IST is 06:30–20:30 in Riyadh — the spec's worked example.
    expect(
      formatTimeRange(result.ksaWorkStart!, result.ksaWorkEnd!, APP_SETTINGS.ksaTimeZone),
    ).toBe('6:30 AM – 8:30 PM')

    // The KSA values are the same instants, only re-expressed.
    expect(result.ksaWorkStart!.getTime()).toBe(result.localWorkStart!.getTime())
    expect(result.ksaWorkEnd!.getTime()).toBe(result.localWorkEnd!.getTime())
  })

  // Required test 4
  it('computes hours left during a shift', () => {
    const result = computeAvailability(indiaMember, INSTANTS.mondayMidShiftIst)

    // 14:30 IST to a 23:00 IST finish is 8.5 hours.
    expect(result.hoursLeft).toBeCloseTo(8.5, 5)
    expect(result.elapsedHours).toBeCloseTo(5.5, 5)
    expect(result.isWithinWorkingHours).toBe(true)
    expect(result.startsInHours).toBeNull()
    expect(result.status).toBe('online')
  })

  // Required test 5
  it('reports zero hours left after the shift ends', () => {
    const result = computeAvailability(indiaMember, INSTANTS.mondayAfterShiftIst)

    expect(result.hoursLeft).toBe(0)
    expect(result.isWithinWorkingHours).toBe(false)
    expect(result.deploymentEligible).toBe(false)
    expect(result.status).toBe('offline')
  })

  it('never reports a negative hours-left value', () => {
    // Well past the end of the shift.
    const result = computeAvailability(indiaMember, new Date('2026-07-20T18:59:00Z'))
    expect(result.hoursLeft).toBeGreaterThanOrEqual(0)
  })

  // Required test 6
  it('reports Starts Soon with the correct lead time before a shift', () => {
    const result = computeAvailability(indiaMember, INSTANTS.mondayJustBeforeShiftIst)

    // 08:00 IST, one hour before the 09:00 IST start.
    expect(result.startsInHours).toBeCloseTo(1, 5)
    expect(result.isWithinWorkingHours).toBe(false)
    expect(result.status).toBe('starts-soon')
    // The whole shift is still ahead, so hours left is the full duration.
    expect(result.hoursLeft).toBeCloseTo(14, 5)
  })

  it('reports Offline when the shift is more than two hours away', () => {
    const result = computeAvailability(indiaMember, INSTANTS.mondayEarlyMorningIst)

    // 05:30 IST — 3.5 hours before the start.
    expect(result.startsInHours).toBeCloseTo(3.5, 5)
    expect(result.status).toBe('offline')
  })

  // Required test 7
  it('reports a non-working day', () => {
    const result = computeAvailability(indiaMember, INSTANTS.sundayMiddayIst)

    expect(result.status).toBe('non-working-day')
    expect(result.hoursLeft).toBe(0)
    expect(result.isWithinWorkingHours).toBe(false)
    expect(result.deploymentEligible).toBe(false)
  })

  // Pins the business rule itself. The boundary tests below derive from this
  // value, so this is what fails if the configured minimum is changed.
  it('requires 5 hours for a production deployment', () => {
    expect(APP_SETTINGS.productionDeploymentMinimumHours).toBe(5)
  })

  // Required test 8
  it('is deployment eligible at exactly the configured minimum', () => {
    const result = computeAvailability(
      indiaMember,
      INSTANTS.mondayExactlyDeploymentWindowIst,
    )

    expect(result.hoursLeft).toBeCloseTo(DEPLOYMENT_MINIMUM, 5)
    expect(result.deploymentEligible).toBe(true)
    expect(result.status).toBe('online')
  })

  // Required test 9
  it('is not deployment eligible just below the configured minimum', () => {
    const result = computeAvailability(
      indiaMember,
      INSTANTS.mondayJustUnderDeploymentWindowIst,
    )

    expect(result.hoursLeft).toBeLessThan(DEPLOYMENT_MINIMUM)
    expect(result.deploymentEligible).toBe(false)
    expect(result.status).toBe('limited')
  })

  // Required test 14
  it('reports Schedule Unavailable for an invalid time zone', () => {
    const broken = makeMember({ id: 'broken-tz', timeZone: 'Not/AZone' })
    const result = computeAvailability(broken, INSTANTS.mondayMidShiftIst)

    expect(result.status).toBe('schedule-unavailable')
    expect(result.hoursLeft).toBe(0)
    expect(result.localWorkStart).toBeNull()
    expect(result.ksaWorkStart).toBeNull()
    expect(result.scheduleIssue).toMatch(/time zone/i)
  })

  it('reports Schedule Unavailable for malformed working hours', () => {
    const broken = makeMember({
      id: 'broken-hours',
      workSchedule: { startLocal: '9am', endLocal: '23:00', workDays: [1, 2, 3, 4, 5] },
    })
    const result = computeAvailability(broken, INSTANTS.mondayMidShiftIst)

    expect(result.status).toBe('schedule-unavailable')
    expect(result.scheduleIssue).toMatch(/HH:mm/i)
  })

  it('reports Schedule Unavailable when no working days are configured', () => {
    const broken = makeMember({
      id: 'no-days',
      workSchedule: { startLocal: '09:00', endLocal: '23:00', workDays: [] },
    })
    expect(computeAvailability(broken, INSTANTS.mondayMidShiftIst).status).toBe(
      'schedule-unavailable',
    )
  })

  it('respects each member time zone for the same instant', () => {
    // 09:00 UTC is mid-shift in India but pre-dawn in Chicago.
    const chicago = makeMember({
      id: 'chicago',
      timeZone: 'America/Chicago',
      locationLabel: 'Omaha, USA',
    })

    const india = computeAvailability(indiaMember, INSTANTS.mondayMidShiftIst)
    const omaha = computeAvailability(chicago, INSTANTS.mondayMidShiftIst)

    expect(india.isWithinWorkingHours).toBe(true)
    expect(omaha.isWithinWorkingHours).toBe(false)
    expect(omaha.status).toBe('offline') // 04:00 local, five hours before start
  })

  it('treats an end at or before the start as an overnight shift', () => {
    const nightShift = makeMember({
      id: 'night',
      workSchedule: { startLocal: '22:00', endLocal: '06:00', workDays: [1, 2, 3, 4, 5] },
    })
    // 23:30 IST on Monday — inside a shift that closes at 06:00 Tuesday.
    const result = computeAvailability(nightShift, INSTANTS.mondayAfterShiftIst)

    expect(result.isWithinWorkingHours).toBe(true)
    expect(result.hoursLeft).toBeCloseTo(6.5, 5)
    expect(result.localWorkEnd!.getTime()).toBeGreaterThan(
      result.localWorkStart!.getTime(),
    )
  })

  it('honours an overridden deployment minimum', () => {
    // Just under the configured minimum, but comfortably over a lower one.
    const result = computeAvailability(
      indiaMember,
      INSTANTS.mondayJustUnderDeploymentWindowIst,
      { minimumDeploymentHours: DEPLOYMENT_MINIMUM - 1 },
    )
    expect(result.deploymentEligible).toBe(true)
  })
})
