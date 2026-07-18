import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { App } from './App'
import { INSTANTS } from './test/factories'

/**
 * Component tests drive the real dataset (36 team-membership records) through
 * the assembled page. The clock is frozen so every assertion is deterministic.
 */

const TOTAL_MEMBERS = 36

function setNow(instant: Date) {
  // `shouldAdvanceTime` lets user-event's internal timers still progress.
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(instant)
}

async function renderApp(): Promise<UserEvent> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<App />)
  // Wait past the loading skeleton. Case-sensitive so it cannot collide with
  // prose elsewhere on the page.
  await screen.findByText(/Showing/)
  return user
}

/** The page header, so header-only text can be told apart from table cells. */
function getBanner(): HTMLElement {
  return screen.getByRole('banner')
}

/** Body rows only — the header row lives in its own rowgroup. */
function getDataRows() {
  const [body] = screen.getAllByRole('rowgroup').slice(1)
  return within(body!).getAllByRole('row')
}

function getShowingText(): string {
  return screen.getByText(/Showing/).textContent ?? ''
}

beforeEach(() => {
  setNow(INSTANTS.ksaBeforeCutoff)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('page shell', () => {
  it('renders the Agility Insights branding and page title', async () => {
    await renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Agility Insights' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Global Team Availability')).toBeInTheDocument()
    expect(screen.getByText('Find the right time to connect')).toBeInTheDocument()
    // The same label is also a table column, so scope to the header.
    expect(within(getBanner()).getByText('KSA Current Time')).toBeInTheDocument()
  })

  it('shows no Goldman Sachs branding', async () => {
    await renderApp()
    expect(document.body.textContent).not.toMatch(/goldman/i)
  })

  it('shows the KSA clock in Asia/Riyadh', async () => {
    await renderApp()
    // 09:00 UTC is 12:00 in Riyadh. Every row repeats it, so scope to the header.
    expect(within(getBanner()).getByText('12:00 PM')).toBeInTheDocument()
    expect(within(getBanner()).getByText('Mon, Jul 20, 2026')).toBeInTheDocument()
  })

  it('loads every team-membership record', async () => {
    await renderApp()
    expect(getShowingText()).toMatch(new RegExp(`Showing\\s*${TOTAL_MEMBERS}`))
  })

  it('renders the deployment timeline and communication cards', async () => {
    await renderApp()

    expect(screen.getByText('Production Deployment Minimum Timeline')).toBeInTheDocument()
    expect(screen.getByText('5 hours')).toBeInTheDocument()
    expect(
      screen.getByText(/Minimum notice required before production deployment/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/please communicate before 4:00 PM KSA/i),
    ).toBeInTheDocument()
  })

  it('states that status is schedule-based rather than attendance-based', async () => {
    await renderApp()
    expect(
      screen.getByText(/do not reflect actual login, logout, attendance, or presence/i),
    ).toBeInTheDocument()
  })

  it('detects a viewer time zone without blocking the page', async () => {
    await renderApp()
    expect(screen.getByLabelText('Time zone')).toBeInTheDocument()
    expect(getDataRows().length).toBeGreaterThan(0)
  })
})

describe('search and filters', () => {
  // Required test 10
  it('searches by name', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Lexi')

    expect(getShowingText()).toMatch(/Showing\s*1\s*of\s*36/)
    expect(screen.getByText('Lexi Addams')).toBeInTheDocument()
  })

  it('searches by team', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Guardians')
    expect(getShowingText()).toMatch(/Showing\s*3\s*of\s*36/)
  })

  it('searches by role', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'UI/UX')
    // Three UI/UX designers, all on the UI/UX team.
    expect(getShowingText()).toMatch(/Showing\s*3\s*of\s*36/)
  })

  it('searches by location', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Azerbaijan')
    expect(getShowingText()).toMatch(/Showing\s*1\s*of\s*36/)
  })

  it('searches by email', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'dave@')
    expect(getShowingText()).toMatch(/Showing\s*1\s*of\s*36/)
  })

  it('filters by team from the dropdown', async () => {
    const user = await renderApp()
    await user.selectOptions(screen.getByLabelText('Team'), 'Warriors')
    expect(getShowingText()).toMatch(/Showing\s*12\s*of\s*36/)
  })

  // Required test 11
  it('applies team, role and search filters together', async () => {
    const user = await renderApp()

    await user.selectOptions(screen.getByLabelText('Team'), 'Warriors')
    expect(getShowingText()).toMatch(/Showing\s*12\s*of\s*36/)

    await user.selectOptions(screen.getByLabelText('Role'), 'Frontend')
    expect(getShowingText()).toMatch(/Showing\s*3\s*of\s*36/)

    await user.selectOptions(screen.getByLabelText('Location'), 'Pakistan')
    expect(getShowingText()).toMatch(/Showing\s*3\s*of\s*36/)

    // Narrow further with free text; the dropdown filters still apply.
    await user.type(screen.getByLabelText('Search team members'), 'Razi')
    expect(getShowingText()).toMatch(/Showing\s*1\s*of\s*36/)
  })

  it('shows the empty state when nothing matches', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'zzzznobody')

    expect(
      screen.getByText('No team members match the selected filters.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
  })

  // Required test 12
  it('resets every filter back to the default list', async () => {
    const user = await renderApp()

    await user.type(screen.getByLabelText('Search team members'), 'Lexi')
    await user.selectOptions(screen.getByLabelText('Team'), 'Guardians')
    expect(getShowingText()).toMatch(/Showing\s*1\s*of\s*36/)

    await user.click(screen.getByRole('button', { name: /Reset/i }))

    expect(getShowingText()).toMatch(/Showing\s*36\s*of\s*36/)
    expect(screen.getByLabelText('Search team members')).toHaveValue('')
    expect(screen.getByLabelText('Team')).toHaveValue('__all__')
  })

  it('filters to shared members from the More Filters panel', async () => {
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: /More Filters/i }))
    await user.click(screen.getByLabelText('Shared team members only'))

    // Twelve membership records carry the shared marker.
    expect(getShowingText()).toMatch(/Showing\s*12\s*of\s*36/)
  })

  it('closes the More Filters popover on Escape', async () => {
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: /More Filters/i }))
    expect(screen.getByRole('dialog', { name: 'More filters' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'More filters' })).not.toBeInTheDocument()
  })
})

describe('pagination', () => {
  it('paginates the full dataset ten rows at a time', async () => {
    await renderApp()

    expect(getDataRows()).toHaveLength(10)
    expect(screen.getByText('1 – 10 of 36')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 4' })).toBeInTheDocument()
  })

  it('moves between pages', async () => {
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('11 – 20 of 36')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('changes the rows-per-page size', async () => {
    const user = await renderApp()

    await user.selectOptions(screen.getByLabelText('Rows per page:'), '20')
    expect(getDataRows()).toHaveLength(20)
    expect(screen.getByText('1 – 20 of 36')).toBeInTheDocument()
  })

  // Required test 13
  it('returns to page 1 when a filter changes', async () => {
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(screen.getByText('21 – 30 of 36')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search team members'), 'a')

    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText(/^1 – /)).toBeInTheDocument()
  })
})

describe('table content', () => {
  it('shows the KSA working-hours range rather than an elapsed duration', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Vinay')

    const row = getDataRows()[0]!
    // An India shift of 09:00-23:00 IST is 06:30-20:30 in Riyadh.
    expect(within(row).getByText(/6:30 AM – 8:30 PM/)).toBeInTheDocument()
    expect(within(row).getByText('KSA')).toBeInTheDocument()
  })

  it('marks shared team members', async () => {
    const user = await renderApp()
    await user.type(screen.getByLabelText('Search team members'), 'Anuj')

    const rows = getDataRows()
    expect(rows.length).toBeGreaterThan(0)
    expect(within(rows[0]!).getByText('Shared')).toBeInTheDocument()
  })

  it('exposes sortable columns with aria-sort', async () => {
    const user = await renderApp()

    const nameHeader = screen.getByRole('columnheader', { name: /Team Member/i })
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')

    await user.click(within(nameHeader).getByRole('button'))
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it('sorts by name when the header is activated', async () => {
    const user = await renderApp()

    const nameHeader = screen.getByRole('columnheader', { name: /Team Member/i })
    await user.click(within(nameHeader).getByRole('button'))

    // "Aasmi Saini" sorts first alphabetically.
    expect(within(getDataRows()[0]!).getByText('Aasmi Saini')).toBeInTheDocument()
  })
})

describe('production communication cutoff', () => {
  // Required test 15
  it('hides the advisory before 4:00 PM KSA', async () => {
    await renderApp()
    expect(
      screen.queryByText(/preferred 4:00 PM KSA communication window has passed/i),
    ).not.toBeInTheDocument()
  })

  it('shows the advisory after 4:00 PM KSA without hiding data', async () => {
    vi.useRealTimers()
    setNow(INSTANTS.ksaAfterCutoff) // 17:00 KSA
    await renderApp()

    expect(
      screen.getByText(/preferred 4:00 PM KSA communication window has passed/i),
    ).toBeInTheDocument()
    // Advisory only — the table is untouched.
    expect(getShowingText()).toMatch(/Showing\s*36\s*of\s*36/)
    expect(getDataRows()).toHaveLength(10)
  })
})
