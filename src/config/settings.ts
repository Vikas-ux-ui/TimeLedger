/**
 * Single source of truth for business configuration.
 *
 * Every business rule the UI enforces reads from here — nothing is hardcoded
 * at the call site — so a future backend can override these values wholesale.
 */
export const APP_SETTINGS = {
  applicationName: 'Agility Insights',
  pageTitle: 'Global Team Availability',
  pageSubtitle: 'Find the right time to connect',
  ksaTimeZone: 'Asia/Riyadh',
  productionDeploymentMinimumHours: 4.5,
  productionCommunicationCutoffKsa: '16:00',
  defaultWorkStartLocal: '09:00',
  defaultWorkEndLocal: '23:00',
  primaryHeaderColor: '#7296C4',
  tableHeaderColor: '#E2E2E5',
  fontFamily: '"Times New Roman", Times, serif',
} as const

/** A shift opening within this many hours reads as `Starts Soon`. */
export const STARTS_SOON_THRESHOLD_HOURS = 2

/** How often the shared page clock re-reads the current instant. */
export const CLOCK_TICK_MS = 30_000

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const

export const DEFAULT_ROWS_PER_PAGE = 10
