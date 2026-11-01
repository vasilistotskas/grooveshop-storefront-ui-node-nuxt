/** Where the editor's sign-in stands. */
export type BuilderSessionStatus
  = | 'loading'
    | 'signedIn'
    /** No session: the editor was opened without a ticket, or the session ended. */
    | 'signedOut'
    /** Django refused the ticket: expired, already used, or not one. */
    | 'invalidTicket'
    | 'error'

/**
 * Why a call to `/api/builder/session` failed, as a status: 401 is no
 * session, Django's 400 `{ code: 'invalid_ticket' }` (returned as it is by
 * `server/api/builder/session.post.ts`) a refused ticket, anything else an
 * error to report.
 */
export function builderSessionFailure(error: unknown): Exclude<BuilderSessionStatus, 'loading' | 'signedIn'> {
  if (typeof error !== 'object' || error === null) return 'error'
  const statusCode = 'statusCode' in error ? error.statusCode : undefined
  if (statusCode === 401) return 'signedOut'
  const data = 'data' in error ? error.data : undefined
  const code = typeof data === 'object' && data !== null && 'code' in data ? data.code : undefined
  return statusCode === 400 && code === 'invalid_ticket' ? 'invalidTicket' : 'error'
}
