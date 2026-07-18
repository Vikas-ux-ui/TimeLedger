import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_SETTINGS, DEFAULT_SETTINGS, resolveSettings } from './settings'
import { getSeedSettings } from '../services/teamAvailabilityService'

const FALLBACK = DEFAULT_SETTINGS.productionDeploymentMinimumHours

/** Silences the expected console warning and lets a test assert on it. */
function captureWarnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('productionDeploymentMinimumHours', () => {
  it('uses the value supplied by the configuration file', () => {
    expect(
      resolveSettings({ productionDeploymentMinimumHours: 6 })
        .productionDeploymentMinimumHours,
    ).toBe(6)
  })

  it('accepts a fractional value', () => {
    expect(
      resolveSettings({ productionDeploymentMinimumHours: 4.5 })
        .productionDeploymentMinimumHours,
    ).toBe(4.5)
  })

  it('accepts zero, meaning no minimum is enforced', () => {
    expect(
      resolveSettings({ productionDeploymentMinimumHours: 0 })
        .productionDeploymentMinimumHours,
    ).toBe(0)
  })

  it('falls back when the field is missing', () => {
    expect(resolveSettings({}).productionDeploymentMinimumHours).toBe(FALLBACK)
  })

  it('rejects a negative value', () => {
    const warn = captureWarnings()
    expect(
      resolveSettings({ productionDeploymentMinimumHours: -3 })
        .productionDeploymentMinimumHours,
    ).toBe(FALLBACK)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/must not be negative/i)
  })

  it('rejects a value beyond a single day', () => {
    const warn = captureWarnings()
    // A minimum longer than any possible shift would make everyone ineligible.
    expect(
      resolveSettings({ productionDeploymentMinimumHours: 25 })
        .productionDeploymentMinimumHours,
    ).toBe(FALLBACK)
    expect(warn.mock.calls[0]![0]).toMatch(/must not exceed 24/i)
  })

  it.each([
    ['a string', '5'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['null-ish text', 'five'],
    ['an object', { hours: 5 }],
    ['a boolean', true],
  ])('rejects %s', (_label, value) => {
    captureWarnings()
    expect(
      resolveSettings({ productionDeploymentMinimumHours: value })
        .productionDeploymentMinimumHours,
    ).toBe(FALLBACK)
  })
})

describe('backward compatibility', () => {
  it('returns every default when the settings block is absent', () => {
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns every default when the settings block is not an object', () => {
    captureWarnings()
    expect(resolveSettings('nonsense')).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps unspecified fields at their defaults when only one is supplied', () => {
    const resolved = resolveSettings({ productionDeploymentMinimumHours: 7 })

    expect(resolved.productionDeploymentMinimumHours).toBe(7)
    expect(resolved.ksaTimeZone).toBe(DEFAULT_SETTINGS.ksaTimeZone)
    expect(resolved.productionCommunicationCutoffKsa).toBe(
      DEFAULT_SETTINGS.productionCommunicationCutoffKsa,
    )
  })

  it('preserves the branding fields, which are not configurable', () => {
    const resolved = resolveSettings({ applicationName: 'Something Else' })
    expect(resolved.applicationName).toBe(DEFAULT_SETTINGS.applicationName)
  })
})

describe('other configurable fields', () => {
  it('accepts a valid IANA time zone and rejects an invalid one', () => {
    expect(resolveSettings({ ksaTimeZone: 'Asia/Dubai' }).ksaTimeZone).toBe('Asia/Dubai')

    captureWarnings()
    expect(resolveSettings({ ksaTimeZone: 'Not/AZone' }).ksaTimeZone).toBe(
      DEFAULT_SETTINGS.ksaTimeZone,
    )
  })

  it('accepts a valid HH:mm cutoff and rejects an invalid one', () => {
    expect(
      resolveSettings({ productionCommunicationCutoffKsa: '17:30' })
        .productionCommunicationCutoffKsa,
    ).toBe('17:30')

    captureWarnings()
    expect(
      resolveSettings({ productionCommunicationCutoffKsa: '25:00' })
        .productionCommunicationCutoffKsa,
    ).toBe(DEFAULT_SETTINGS.productionCommunicationCutoffKsa)
  })
})

describe('live configuration', () => {
  it('reads the deployment minimum from the configuration file, not a constant', () => {
    const fromFile = getSeedSettings()?.productionDeploymentMinimumHours

    // Asserts the wiring, not a specific number: editing the JSON must not
    // require editing this test.
    expect(fromFile).toBeDefined()
    expect(APP_SETTINGS.productionDeploymentMinimumHours).toBe(fromFile)
  })

  it('exposes a usable deployment minimum whatever the file says', () => {
    const value = APP_SETTINGS.productionDeploymentMinimumHours
    expect(typeof value).toBe('number')
    expect(Number.isFinite(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
  })
})
