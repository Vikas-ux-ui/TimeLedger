import { describe, expect, it } from 'vitest'
import {
  getIdentityKey,
  normalizeEmail,
  selectSameIdentity,
  sharesIdentity,
} from './identityUtils'

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Aasmi.Saini@AgilityInsights.ai ')).toBe(
      'aasmi.saini@agilityinsights.ai',
    )
  })

  it('treats missing or blank values as absent', () => {
    expect(normalizeEmail(undefined)).toBeUndefined()
    expect(normalizeEmail(null)).toBeUndefined()
    expect(normalizeEmail('   ')).toBeUndefined()
  })
})

describe('getIdentityKey', () => {
  it('keys on the email when there is one', () => {
    expect(getIdentityKey({ id: 'a', email: 'anuj@example.com' })).toBe(
      'email:anuj@example.com',
    )
  })

  it('ignores case and whitespace differences in the email', () => {
    expect(getIdentityKey({ id: 'warriors--anuj', email: ' Anuj@Example.com ' })).toBe(
      getIdentityKey({ id: 'fastlane--anuj', email: 'anuj@example.com' }),
    )
  })

  it('falls back to the record id when no email is present', () => {
    // Without this, every record missing an email would collapse into one
    // person and share a schedule.
    const a = { id: 'one' }
    const b = { id: 'two' }
    expect(getIdentityKey(a)).toBe('id:one')
    expect(sharesIdentity(a, b)).toBe(false)
  })
})

describe('sharesIdentity', () => {
  it('matches records with the same email across different teams', () => {
    expect(
      sharesIdentity(
        { id: 'warriors--anuj', email: 'anuj@example.com' },
        { id: 'skynet--anuj', email: 'anuj@example.com' },
      ),
    ).toBe(true)
  })

  it('does not match different emails, even for the same person’s name', () => {
    // The dataset really does carry two addresses for one person; merging them
    // would need an explicit identity mapping, not a guess.
    expect(
      sharesIdentity(
        { id: 'warriors--anuj', email: 'anuj@agilityhealthradar.com' },
        { id: 'fastlane--anuj', email: 'anuj@agilityinsights.ai' },
      ),
    ).toBe(false)
  })
})

describe('selectSameIdentity', () => {
  const roster = [
    { id: 'warriors--anuj', email: 'anuj@insights.ai' },
    { id: 'fastlane--anuj', email: 'ANUJ@insights.ai' },
    { id: 'skynet--anuj', email: 'anuj@insights.ai' },
    { id: 'guardians--lexi', email: 'lexi@insights.ai' },
    { id: 'no-email' },
  ]

  it('returns every record for the person, including the one passed in', () => {
    const found = selectSameIdentity(roster, roster[0]!)
    expect(found.map((m) => m.id)).toEqual([
      'warriors--anuj',
      'fastlane--anuj',
      'skynet--anuj',
    ])
  })

  it('returns just the one record for a person on a single team', () => {
    expect(selectSameIdentity(roster, roster[3]!).map((m) => m.id)).toEqual([
      'guardians--lexi',
    ])
  })

  it('does not group records that have no email', () => {
    expect(selectSameIdentity(roster, roster[4]!).map((m) => m.id)).toEqual(['no-email'])
  })
})
