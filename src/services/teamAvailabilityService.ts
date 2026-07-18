import type {
  ConfigurableSettings,
  TeamAvailabilitySeedData,
  TeamMember,
} from '../types/teamMember'
import seedData from '../data/team-availability-seed-data.json'

/**
 * Data access boundary.
 *
 * The prototype resolves the bundled JSON, but the signature is already the
 * async shape a real `GET /api/team-availability` call would have. Swapping in
 * `fetch` later touches this file only — no component or hook changes.
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const payload = seedData as TeamAvailabilitySeedData
  return Promise.resolve(payload.items)
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
