/**
 * Person identity across team-membership records.
 *
 * One person can hold several memberships — one row per team — and those rows
 * describe the same human being. Email is the identifier that ties them
 * together, so a schedule change made against any one row applies to all of
 * them.
 *
 * Deliberately dependency-free: the dev-server plugin imports this too, so the
 * browser and the file writer group records by exactly the same rule.
 */

/** A record carrying enough to be identified. */
export type IdentifiableMember = {
  id: string
  email?: string | undefined
}

/**
 * Email comparison ignores surrounding whitespace and case. The source
 * spreadsheet contains both (`Aasmi.Saini@…` beside `aasmi.saini@…`), and
 * mailbox providers treat them as one address.
 */
export function normalizeEmail(email: string | undefined | null): string | undefined {
  if (typeof email !== 'string') return undefined
  const normalized = email.trim().toLowerCase()
  return normalized === '' ? undefined : normalized
}

/**
 * A stable key for the person behind a record.
 *
 * Falls back to the record's own id when no email is present, so records
 * missing an email stay separate people rather than collapsing into one.
 */
export function getIdentityKey(member: IdentifiableMember): string {
  const email = normalizeEmail(member.email)
  return email ? `email:${email}` : `id:${member.id}`
}

/** `true` when two records describe the same person. */
export function sharesIdentity(a: IdentifiableMember, b: IdentifiableMember): boolean {
  return getIdentityKey(a) === getIdentityKey(b)
}

/** Every record belonging to the same person as `member`, including itself. */
export function selectSameIdentity<T extends IdentifiableMember>(
  members: T[],
  member: IdentifiableMember,
): T[] {
  const key = getIdentityKey(member)
  return members.filter((candidate) => getIdentityKey(candidate) === key)
}
