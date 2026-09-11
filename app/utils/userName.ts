/**
 * How a user account is labelled wherever a person is shown.
 *
 * Usernames on this platform are GENERATED — `UserNameGenerator` builds
 * `{Adjective}{Noun}#{hash}` from the email — so every account has one
 * and a name-or-username check written the wrong way round never
 * reaches the real name. The blog comment byline read
 * `username || firstName + ' ' + lastName`, so a comment by "Webside
 * Admin" was signed "Paok1441"; the unguarded concatenation also
 * rendered "undefined undefined" for an account with neither.
 *
 * Precedence is the one the backend already uses for staff-facing
 * labels (`UserAccount.__str__`, `full_name or username or email`):
 * the person's name first, the handle only when there is no name.
 * Email is deliberately NOT a fallback here — this renders on public
 * comment and review bylines, where showing an address would expose it
 * to anonymous readers, and `UserPublic` does not carry one at all.
 */
export function displayUserName(
  user: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  } | null | undefined,
): string {
  if (!user) return ''
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return fullName || user.username || ''
}

/** Initials for an avatar, from the same identity the label uses. */
export function displayUserInitials(
  user: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  } | null | undefined,
): string {
  if (!user) return ''
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
  return (initials || displayUserName(user).slice(0, 1)).toUpperCase()
}
