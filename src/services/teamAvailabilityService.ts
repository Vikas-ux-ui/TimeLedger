import type {
  ConfigurableSettings,
  TeamAvailabilitySeedData,
  TeamMember,
} from '../types/teamMember'
import seedData from '../data/team-availability-seed-data.json'
import { getIdentityKey } from '../utils/identityUtils'

/**
 * Data access boundary.
 *
 * The prototype resolves the bundled JSON, but the signatures are already the
 * async shape a real API would have. Swapping in `fetch` later touches this
 * file only — no component or hook changes.
 */

/**
 * Overlay of edits applied on top of the seed file.
 *
 * Keyed by identity, not by record id, so an edit made against one team
 * membership applies to every membership the same person holds.
 */
const OVERRIDES_STORAGE_KEY = 'agility-insights.schedule-overrides.v2'

type ScheduleOverride = { endLocal?: string }
type OverrideMap = Record<string, ScheduleOverride>

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTimeOfDay(value: string): boolean {
  return TIME_PATTERN.test(value)
}

function readOverrides(): OverrideMap {
  try {
    const stored = globalThis.localStorage?.getItem(OVERRIDES_STORAGE_KEY)
    if (!stored) return {}
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as OverrideMap
  } catch {
    // A corrupt or unavailable store must never stop the page loading.
    return {}
  }
}

function writeOverride(id: string, override: ScheduleOverride): void {
  try {
    const all = readOverrides()
    all[id] = { ...all[id], ...override }
    globalThis.localStorage?.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage can be full or blocked; the in-memory update still stands.
  }
}

/** Clears every stored edit, restoring the values in the seed file. */
export function clearScheduleOverrides(): void {
  try {
    globalThis.localStorage?.removeItem(OVERRIDES_STORAGE_KEY)
  } catch {
    // Nothing to do — the caller cannot act on this either.
  }
}

function applyOverrides(members: TeamMember[], overrides: OverrideMap): TeamMember[] {
  if (Object.keys(overrides).length === 0) return members

  return members.map((member) => {
    // Looked up by identity, so one stored edit covers every membership the
    // person holds.
    const override = overrides[getIdentityKey(member)]
    if (!override?.endLocal || !isValidTimeOfDay(override.endLocal)) return member

    return {
      ...member,
      workSchedule: { ...member.workSchedule, endLocal: override.endLocal },
    }
  })
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const payload = seedData as TeamAvailabilitySeedData
  // Locally stored edits win over the bundled file. In development the file
  // itself is updated too, so the two agree; the overlay is what carries an
  // edit made against a production build.
  return Promise.resolve(applyOverrides(payload.items, readOverrides()))
}

/**
 * The raw `settings` block from the configuration file.
 *
 * Returned unvalidated on purpose — `resolveSettings` in the config layer owns
 * validation, so this stays a pure data-access concern. Reads synchronously
 * because the config is bundled; a future API would resolve it alongside the
 * team payload.
 */
export function getSeedSettings(): ConfigurableSettings | undefined {
  return (seedData as TeamAvailabilitySeedData).settings
}

export type PersistResult = {
  /** `true` when the change reached the configuration file on disk. */
  persistedToFile: boolean
}

/**
 * The endpoint was reached and refused the change.
 *
 * Distinct from a transport failure: a rejection must surface to the user,
 * whereas an absent endpoint legitimately falls back to the local overlay.
 */
export class ScheduleUpdateRejectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleUpdateRejectedError'
  }
}

/**
 * Persists a member's scheduled logout time — the end of their working day in
 * their own time zone.
 *
 * In development this writes the seed JSON through the dev-server endpoint. If
 * that endpoint is absent (any production build) the edit is kept in a local
 * overlay instead, so the change still survives a refresh. Either way the
 * caller has already updated its own state, so the UI does not wait on this.
 */
export async function updateMemberLogoutTime(
  member: TeamMember,
  endLocal: string,
): Promise<PersistResult> {
  if (!isValidTimeOfDay(endLocal)) {
    throw new Error(`"${endLocal}" is not a valid HH:mm time.`)
  }

  const identityKey = getIdentityKey(member)
  const id = member.id

  try {
    // The record id addresses the row; the server resolves it to the person and
    // updates every membership they hold.
    const response = await fetch(`/api/team-members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endLocal }),
    })

    if (response.ok) {
      // The file is now the source of truth; drop any stale overlay entry so
      // the two cannot disagree after a refresh.
      const all = readOverrides()
      if (all[identityKey]) {
        delete all[identityKey]
        try {
          globalThis.localStorage?.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all))
        } catch {
          // Best effort only.
        }
      }
      return { persistedToFile: true }
    }

    // A 4xx means the endpoint exists and refused the change. A 404 is
    // ambiguous — most likely no such route — so it falls back instead.
    if (response.status >= 400 && response.status < 500 && response.status !== 404) {
      throw new ScheduleUpdateRejectedError(
        `the server rejected the change (${response.status}).`,
      )
    }
  } catch (cause) {
    if (cause instanceof ScheduleUpdateRejectedError) throw cause
    // Network error or no such endpoint — fall through to the local overlay.
  }

  writeOverride(identityKey, { endLocal })
  return { persistedToFile: false }
}
