import postSession from '~~/server/api/builder/session.post'
import { BUILDER_SESSION_COOKIE } from '~~/shared/constants/builderSession'
import { backend, callRoute } from '~~/test/helpers/nitro'

/** The staff member every builder route spec signs in as. */
export const BUILDER_STAFF = { id: 7, name: 'Maria Papadopoulou', role: 'admin' }

/** The token Django gave that staff member; specs assert it reaches Django as StaffBearer and nothing else. */
export const BUILDER_STAFF_TOKEN = 'knox-secret-token'

/**
 * The builder cookie of a signed-in staff member, as the browser sends it
 * back (`name=value`): made by the real sign-in route, so every builder
 * route spec reads a session sealed exactly as production seals it. Uses
 * one backend reply; queue the route's own replies after it.
 */
export async function signInBuilderStaff(): Promise<string> {
  backend.replyOnce({
    token: BUILDER_STAFF_TOKEN,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    staff: BUILDER_STAFF,
  })
  const response = await callRoute(postSession, {
    route: '/api/builder/session',
    method: 'POST',
    body: { ticket: 'one-time-ticket' },
  })
  const cookie = response.headers.getSetCookie().find(value => value.startsWith(`${BUILDER_SESSION_COOKIE}=`))?.split(';')[0]
  if (!cookie) throw new Error('the builder sign-in set no cookie')
  return cookie
}
