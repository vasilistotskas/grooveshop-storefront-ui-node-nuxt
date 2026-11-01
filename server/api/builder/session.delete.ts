import { defineEventHandler, setResponseStatus } from 'nuxt/server'

/**
 * Signs the staff member out of the page builder: expires its cookie. The
 * customer session is untouched. Django's token is not revoked (it has no
 * endpoint for that); it stays valid only until its own `expiresAt`, and
 * no browser holds it any more.
 */
export default defineEventHandler(async (event) => {
  try {
    await clearBuilderSession(event)
    event.res.headers.set('Cache-Control', 'private, no-store')
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    return handleError(event, error)
  }
})
