import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { App } from '../../App'
import { INSTANTS } from '../../test/factories'
import { clearScheduleOverrides } from '../../services/teamAvailabilityService'

/**
 * Covers the editable Logout Time column end to end through the real app:
 * the input reflects the schedule, an edit recalculates every derived column,
 * and the change is handed to the persistence layer.
 */

function setNow(instant: Date) {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(instant)
}

async function renderApp(): Promise<UserEvent> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<App />)
  await screen.findByText(/Showing/)
  return user
}

/** The single visible row after filtering down to one person. */
function soleRow(): HTMLElement {
  const [body] = screen.getAllByRole('rowgroup').slice(1)
  return within(body!).getAllByRole('row')[0]!
}

function logoutInput(row: HTMLElement): HTMLInputElement {
  return within(row).getByLabelText(/Scheduled logout time/i) as HTMLInputElement
}

/** Narrows the table to one India member on a 09:00-23:00 IST schedule. */
async function showVinay(user: UserEvent) {
  await user.type(screen.getByLabelText('Search team members'), 'Vinay')
  return soleRow()
}

let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  clearScheduleOverrides()
  // Stand in for the dev-server write endpoint.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  )
  setNow(INSTANTS.mondayMidShiftIst) // Mon 20 Jul 2026, 14:30 IST
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  clearScheduleOverrides()
})

describe('Logout Time column', () => {
  it('adds the column to the table header', async () => {
    await renderApp()
    expect(
      screen.getByRole('columnheader', { name: /Logout Time/i }),
    ).toBeInTheDocument()
  })

  it('shows each member’s scheduled end of day in their own time zone', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    // 23:00 local, the seed default.
    expect(logoutInput(row)).toHaveValue('23:00')
    // Stated in 12-hour form too, since a native time input renders 12- or
    // 24-hour depending on the viewer's locale.
    expect(within(row).getByText('11:00 PM')).toBeInTheDocument()
  })

  it('restates the logout time in 12-hour form', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '20:30')
    await user.tab()

    expect(within(soleRow()).getByText('8:30 PM')).toBeInTheDocument()
  })

  it('labels the input per member for screen readers', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    expect(
      within(row).getByLabelText('Scheduled logout time for Vinay Saini, local time'),
    ).toBeInTheDocument()
  })

  it('recalculates the derived columns when the logout time changes', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    // Before: a 23:00 finish leaves 8h 30m and converts to 8:30 PM KSA.
    expect(within(row).getByText('8h 30m')).toBeInTheDocument()
    expect(within(row).getByText(/6:30 AM – 8:30 PM/)).toBeInTheDocument()

    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '20:00')
    await user.tab()

    const updated = soleRow()
    // After: a 20:00 finish leaves 5h 30m and converts to 5:30 PM KSA.
    expect(within(updated).getByText('5h 30m')).toBeInTheDocument()
    expect(within(updated).getByText(/9:00 AM – 8:00 PM/)).toBeInTheDocument()
    expect(within(updated).getByText(/6:30 AM – 5:30 PM/)).toBeInTheDocument()
    expect(logoutInput(updated)).toHaveValue('20:00')
  })

  it('moves a member below the deployment threshold when the day is shortened', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    // The starting verdict is not asserted: with a full 8h 30m left it depends
    // on the configured minimum, which is a business setting. The end state
    // below holds for any realistic minimum, since 1h 30m clears none of them.
    expect(within(row).getByText('8h 30m')).toBeInTheDocument()

    // 16:00 local leaves only 1h 30m.
    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '16:00')
    await user.tab()

    const updated = soleRow()
    expect(within(updated).getByText('Limited Time')).toBeInTheDocument()
    expect(within(updated).getByText('Insufficient deployment window')).toBeInTheDocument()
    expect(within(updated).getByText('1h 30m')).toBeInTheDocument()
  })

  it('persists the change through the update endpoint', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '21:30')
    await user.tab()

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/team-members/guardians--vinay-saini',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ endLocal: '21:30' }),
      }),
    )
  })

  it('does not call the endpoint when the value is unchanged', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    await user.click(logoutInput(row))
    await user.tab()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reverts and reports when saving fails', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'nope' }), { status: 400 }),
    )

    const user = await renderApp()
    const row = await showVinay(user)

    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '19:00')
    await user.tab()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Logout time could not be saved/i,
    )
    // The optimistic change is rolled back rather than left showing unsaved data.
    expect(logoutInput(soleRow())).toHaveValue('23:00')
  })

  it('restores the stored value when the field is cleared and blurred', async () => {
    const user = await renderApp()
    const row = await showVinay(user)

    const input = logoutInput(row)
    await user.clear(input)
    await user.tab()

    expect(logoutInput(soleRow())).toHaveValue('23:00')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to a local overlay when no endpoint is available', async () => {
    // Simulates a production build, where the dev-server route does not exist.
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'))

    const user = await renderApp()
    const row = await showVinay(user)

    const input = logoutInput(row)
    await user.clear(input)
    await user.type(input, '22:15')
    await user.tab()

    const updated = soleRow()
    // The edit stands, and no error is surfaced.
    expect(logoutInput(updated)).toHaveValue('22:15')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      globalThis.localStorage.getItem('agility-insights.schedule-overrides.v2'),
    ).toContain('22:15')
  })
})

describe('shared identity', () => {
  /** All visible rows, so multi-team people can be inspected together. */
  function allRows() {
    const [body] = screen.getAllByRole('rowgroup').slice(1)
    return within(body!).getAllByRole('row')
  }

  it('updates every team membership sharing the same email', async () => {
    const user = await renderApp()

    // Gopala holds three memberships, all on one address.
    await user.type(screen.getByLabelText('Search team members'), 'Gopala')
    let rows = allRows()
    expect(rows).toHaveLength(3)

    // Edit only the first one. The starting value is not asserted, because the
    // seed file is editable and this test is about propagation, not defaults.
    const first = logoutInput(rows[0]!)
    await user.clear(first)
    await user.type(first, '20:30')
    await user.tab()

    rows = allRows()
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(logoutInput(row)).toHaveValue('20:30')
    }
  })

  it('recalculates the derived columns on every affected row', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Gopala')

    const first = logoutInput(allRows()[0]!)
    await user.clear(first)
    await user.type(first, '20:00')
    await user.tab()

    // 09:00-20:00 IST is 06:30-17:30 in Riyadh, and 14:30 IST leaves 5h 30m.
    for (const row of allRows()) {
      expect(within(row).getByText(/9:00 AM – 8:00 PM/)).toBeInTheDocument()
      expect(within(row).getByText(/6:30 AM – 5:30 PM/)).toBeInTheDocument()
      expect(within(row).getByText('5h 30m')).toBeInTheDocument()
    }
  })

  it('sends one request for the person, not one per membership', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Gopala')

    const first = logoutInput(allRows()[0]!)
    await user.clear(first)
    await user.type(first, '21:00')
    await user.tab()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('leaves a different address alone, even under the same name', async () => {
    const user = await renderApp()

    // Anuj Gupta carries two addresses: one on Warriors, one shared by
    // Fastlane and Skynet & Cassata. They are separate identities.
    await user.type(screen.getByLabelText('Search team members'), 'Anuj')
    let rows = allRows()
    expect(rows).toHaveLength(3)

    // Captured rather than hardcoded: the seed values are editable, so the
    // assertion is "these did not move", not "these equal 23:00".
    const before = rows.map((row) => ({
      isWarriors: within(row).queryByText('Warriors') !== null,
      value: logoutInput(row).value,
    }))
    expect(before.filter((entry) => entry.isWarriors)).toHaveLength(1)

    const warriorsRow = rows.find((row) => within(row).queryByText('Warriors'))!
    const input = logoutInput(warriorsRow)
    await user.clear(input)
    await user.type(input, '18:00')
    await user.tab()

    rows = allRows()
    rows.forEach((row, index) => {
      const wasWarriors = before[index]!.isWarriors
      expect(logoutInput(row)).toHaveValue(
        wasWarriors ? '18:00' : before[index]!.value,
      )
    })
  })

  it('propagates regardless of the filter the edit was made through', async () => {
    const user = await renderApp()

    // Edit Gopala via the Fastlane filter, then check the Warriors record.
    await user.selectOptions(screen.getByLabelText('Team'), 'Fastlane')
    await user.type(screen.getByLabelText('Search team members'), 'Gopala')

    const input = logoutInput(allRows()[0]!)
    await user.clear(input)
    await user.type(input, '19:45')
    await user.tab()

    await user.selectOptions(screen.getByLabelText('Team'), 'Warriors')
    expect(logoutInput(allRows()[0]!)).toHaveValue('19:45')
  })

  it('rolls every affected row back when the save is refused', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'nope' }), { status: 400 }),
    )

    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Gopala')

    // Captured rather than hardcoded, so the assertion is "these went back to
    // what they were", independent of what the seed file currently holds.
    const before = allRows().map((row) => logoutInput(row).value)

    const first = logoutInput(allRows()[0]!)
    await user.clear(first)
    await user.type(first, '17:00')
    await user.tab()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    allRows().forEach((row, index) => {
      expect(logoutInput(row)).toHaveValue(before[index]!)
    })
  })
})

describe('existing table behaviour is unaffected', () => {
  it('still renders every member and the original columns', async () => {
    await renderApp()

    expect(screen.getByText(/Showing/).textContent).toMatch(/36\s*of\s*36/)

    // Checked positionally rather than by name, because several labels are
    // substrings of others ("Team" / "Team Member"). Only the label is
    // asserted, so sort arrows, sub-labels and tooltip copy stay free to change.
    const headers = screen
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')

    const expectedLabels = [
      'Team Member',
      'Team',
      'Location',
      'Local Time',
      'Local Working Hours',
      'Logout Time',
      'KSA Current Time',
      'Working Hours in KSA',
      'Hours Left',
      'Status',
      'Actions',
    ]

    expect(headers).toHaveLength(expectedLabels.length)
    expectedLabels.forEach((label, index) => {
      expect(headers[index]).toContain(label)
    })
  })

  it('still filters and paginates around the new column', async () => {
    const user = await renderApp()

    await user.selectOptions(screen.getByLabelText('Team'), 'Warriors')
    expect(screen.getByText(/Showing/).textContent).toMatch(/12\s*of\s*36/)
    expect(screen.getByText('1 – 10 of 12')).toBeInTheDocument()
  })
})
