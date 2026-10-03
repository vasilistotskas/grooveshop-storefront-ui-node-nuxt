/**
 * A reviewer as a public page names them: first name and the initial of
 * the last ("Giorgos P."), never the full name. `null` when the account
 * carries no name at all, for the caller to say "anonymous" in its own
 * language.
 */
export function reviewerName(user: Pick<UserPublic, 'firstName' | 'lastName'> | null | undefined): string | null {
  const first = user?.firstName?.trim()
  const last = user?.lastName?.trim()
  if (first && last) return `${first} ${last.charAt(0)}.`
  return first || last || null
}
