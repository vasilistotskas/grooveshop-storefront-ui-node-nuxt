import { defineEventHandler, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

/** Whether `error` is Django answering with one of `statuses`. */
function answeredWith(error: unknown, ...statuses: number[]): boolean {
  return typeof error === 'object' && error !== null && 'statusCode' in error
    && typeof error.statusCode === 'number' && statuses.includes(error.statusCode)
}

/**
 * Signs the staff member out of the page builder: revokes their token at
 * Django (`DELETE {apiBaseUrl}/builder/staff-session`, with the token as
 * StaffBearer) and expires the cookie. The customer session is untouched.
 *
 * Django answering 401 or 404 means the token is already gone, which is
 * what was asked for. Any other failure still expires the cookie (the
 * browser must stop holding the token) and then fails the request, so the
 * caller knows the token may live on until its `expiresAt`. A request
 * without a session just gets its cookie expired.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const staff = await requireBuilderStaff(event).catch((error: unknown) => {
      if (answeredWith(error, 401)) return undefined
      throw error
    })
    try {
      if (staff) {
        await useBackendFetch(event)(`${config.apiBaseUrl}/builder/staff-session`, {
          method: 'DELETE',
          headers: staff.headers,
        })
      }
    }
    catch (error) {
      if (!answeredWith(error, 401, 404)) throw error
    }
    finally {
      await clearBuilderSession(event)
    }
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    return handleError(event, error)
  }
})
