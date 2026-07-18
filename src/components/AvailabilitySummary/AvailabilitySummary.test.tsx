import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvailabilitySummary } from './AvailabilitySummary'
import { getExpectedCompletion, selectDeploymentReady } from '../../utils/deploymentUtils'
import { INSTANTS, makeEntry, makeMember } from '../../test/factories'
import { computeAvailability } from '../../utils/availabilityUtils'
import { APP_SETTINGS } from '../../config/settings'
import { formatTimeOfDay } from '../../utils/formatUtils'
import { detectHour12 } from '../../hooks/useTimeFormatPreference'

/**
 * ICU separates the time from AM/PM with a narrow no-break space. Testing
 * Library normalizes whitespace in the DOM but not in the expected string, so
 * the expectation is normalized to match.
 */
const displayed = (value: string) =>
  formatTimeOfDay(value, detectHour12()).replace(/\s+/g, ' ')

const now = INSTANTS.mondayMidShiftIst // Mon 20 Jul 2026, 09:00 UTC / 12:00 KSA
const MINIMUM = APP_SETTINGS.productionDeploymentMinimumHours

/**
 * The threshold used to build fixtures. Pinned locally so these assertions do
 * not move when the configured business minimum does — the component itself is
 * only a presenter of the resulting flag.
 */
const FIXTURE_MINIMUM = 4

/** A member on a 09:00–`endLocal` local schedule, evaluated at `now`. */
function entryWithEnd(id: string, endLocal: string, overrides = {}) {
  return makeEntry(
    makeMember({
      id,
      name: `Member ${id}`,
      workSchedule: { startLocal: '09:00', endLocal, workDays: [1, 2, 3, 4, 5] },
      ...overrides,
    }),
    now,
    { minimumDeploymentHours: FIXTURE_MINIMUM },
  )
}

describe('getExpectedCompletion', () => {
  it('adds the minimum window to the current instant', () => {
    const completion = getExpectedCompletion(new Date('2026-07-20T13:00:00Z'), 5)
    expect(completion.toISOString()).toBe('2026-07-20T18:00:00.000Z')
  })

  it('supports a fractional window', () => {
    const completion = getExpectedCompletion(new Date('2026-07-20T13:00:00Z'), 4.5)
    expect(completion.toISOString()).toBe('2026-07-20T17:30:00.000Z')
  })

  it('never runs backwards on a nonsense value', () => {
    const base = new Date('2026-07-20T13:00:00Z')
    expect(getExpectedCompletion(base, -3).getTime()).toBe(base.getTime())
    expect(getExpectedCompletion(base, Number.NaN).getTime()).toBe(base.getTime())
  })
})

describe('selectDeploymentReady', () => {
  it('keeps only members still on shift when the deployment would finish', () => {
    const ready = entryWithEnd('ready', '23:59') // 9h 29m left
    const tooShort = entryWithEnd('tooShort', '17:00') // 2h 30m left
    const finished = entryWithEnd('finished', '13:00') // already past 14:30 IST

    const result = selectDeploymentReady([ready, tooShort, finished])
    const ids = result.map((entry) => entry.member.id)

    expect(ids).toEqual(['ready'])
    // Every survivor genuinely clears the window.
    for (const entry of result) {
      expect(entry.availability.isWithinWorkingHours).toBe(true)
      expect(entry.availability.hoursLeft).toBeGreaterThanOrEqual(FIXTURE_MINIMUM)
    }
  })

  it('matches the per-row deployment flag exactly, so the two cannot disagree', () => {
    const entries = ['23:59', '20:00', '16:00', '13:00'].map((end, index) =>
      entryWithEnd(`m${index}`, end),
    )

    expect(selectDeploymentReady(entries)).toEqual(
      entries.filter((entry) => entry.availability.deploymentEligible),
    )
  })

  it('excludes a member whose shift has not started yet', () => {
    // 04:00 local in Chicago at this instant — before a 09:00 start.
    const preShift = makeEntry(
      makeMember({ id: 'omaha', timeZone: 'America/Chicago', locationLabel: 'Omaha, USA' }),
      now,
    )
    expect(preShift.availability.isWithinWorkingHours).toBe(false)
    expect(selectDeploymentReady([preShift])).toHaveLength(0)
  })

  it('excludes a member on a non-working day', () => {
    const sunday = makeEntry(makeMember({ id: 'sun' }), INSTANTS.sundayMiddayIst)
    expect(sunday.availability.status).toBe('non-working-day')
    expect(selectDeploymentReady([sunday])).toHaveLength(0)
  })
})

describe('AvailabilitySummary', () => {
  it('shows the deployment window in KSA', () => {
    render(<AvailabilitySummary entries={[entryWithEnd('a', '23:59')]} now={now} />)

    expect(screen.getByText('Available for Deployment')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM')).toBeInTheDocument() // now, KSA
    expect(screen.getByText('Expected completion (KSA)')).toBeInTheDocument()
  })

  it('lists an available member with their local time and logout time', () => {
    // India member, 09:00-23:59 local.
    render(<AvailabilitySummary entries={[entryWithEnd('a', '23:59')]} now={now} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByText(/Member a/)).toBeInTheDocument()
    expect(within(item).getByText('(India)')).toBeInTheDocument()
    expect(within(item).getByText('2:30 PM')).toBeInTheDocument() // local now
    // Logout renders in the viewer's clock format; the stored value is 24-hour.
    expect(within(item).getByText(displayed('23:59'))).toBeInTheDocument()
    expect(within(item).getByText('Available for deployment')).toBeInTheDocument()
  })

  it('converts the completion instant into the member’s own zone', () => {
    render(<AvailabilitySummary entries={[entryWithEnd('a', '23:59')]} now={now} />)

    const item = screen.getByRole('listitem')
    const expected = getExpectedCompletion(now, MINIMUM)
    // Same instant, expressed in Asia/Kolkata.
    const localCompletion = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(expected)

    expect(within(item).getByText('Completes (their time)')).toBeInTheDocument()
    expect(within(item).getByText(localCompletion)).toBeInTheDocument()
  })

  it('omits members who cannot cover the window', () => {
    render(
      <AvailabilitySummary
        entries={[entryWithEnd('stays', '23:59'), entryWithEnd('leaves', '15:00')]}
        now={now}
      />,
    )

    expect(screen.queryByText(/Member leaves/)).not.toBeInTheDocument()
  })

  it('shows only the first three, with the header still reporting the total', async () => {
    const user = userEvent.setup()
    const many = ['23:59', '23:58', '23:57', '23:56', '23:55'].map((end, i) =>
      entryWithEnd(`m${i}`, end),
    )

    render(<AvailabilitySummary entries={many} now={now} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    // The count is the number available, not the number on screen.
    expect(screen.getByText('5')).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /Show 2 more members/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Show less/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('collapses back to three on Show less', async () => {
    const user = userEvent.setup()
    const many = ['23:59', '23:58', '23:57', '23:56'].map((end, i) =>
      entryWithEnd(`m${i}`, end),
    )

    render(<AvailabilitySummary entries={many} now={now} />)

    await user.click(screen.getByRole('button', { name: /Show 1 more member/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: /Show less/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('offers no toggle when three or fewer are available', () => {
    const few = ['23:59', '23:58', '23:57'].map((end, i) => entryWithEnd(`m${i}`, end))

    render(<AvailabilitySummary entries={few} now={now} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Show/i })).not.toBeInTheDocument()
  })

  it('shows a friendly message when nobody is available', () => {
    render(<AvailabilitySummary entries={[entryWithEnd('gone', '13:00')]} now={now} />)

    expect(
      screen.getByText('No team members are available for the selected deployment window.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows the friendly message when the filters match nobody at all', () => {
    render(<AvailabilitySummary entries={[]} now={now} />)

    expect(
      screen.getByText('No team members are available for the selected deployment window.'),
    ).toBeInTheDocument()
  })

  it('reflects a changed logout time without any other input changing', () => {
    const member = makeMember({
      id: 'edited',
      workSchedule: { startLocal: '09:00', endLocal: '23:59', workDays: [1, 2, 3, 4, 5] },
    })

    const { rerender } = render(
      <AvailabilitySummary
        entries={[{ member, availability: computeAvailability(member, now, { minimumDeploymentHours: FIXTURE_MINIMUM }) }]}
        now={now}
      />,
    )
    expect(screen.getByRole('listitem')).toBeInTheDocument()

    // Same person, logout pulled back to just after the current local time.
    const shortened = {
      ...member,
      workSchedule: { ...member.workSchedule, endLocal: '15:00' },
    }
    rerender(
      <AvailabilitySummary
        entries={[
          {
            member: shortened,
            availability: computeAvailability(shortened, now, {
              minimumDeploymentHours: FIXTURE_MINIMUM,
            }),
          },
        ]}
        now={now}
      />,
    )

    expect(
      screen.getByText('No team members are available for the selected deployment window.'),
    ).toBeInTheDocument()
  })
})
