import type { TeamAvailabilitySeedData, TeamMember } from '../types/teamMember'
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

export function getSeedSettings(): TeamAvailabilitySeedData['settings'] {
  return (seedData as TeamAvailabilitySeedData).settings
}
