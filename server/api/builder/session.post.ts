import { defineEventHandler, readValidatedBody, useRuntimeConfig } from 'nuxt/server'

/**
 * Signs a staff member in to the page builder on this store's host.
 *
 * Django's admin ("Edit storefront") mints a single-use ticket and sends
 * the browser to `/_builder?ticket=`; the page posts it here. The ticket
 * is exchanged with Django server to server for a short-lived staff
 * token, which goes into the builder's own sealed HttpOnly cookie
 * (`server/utils/builderSession.ts`) and nowhere else: the browser is told
 * who signed in and until when, never the token.
 *
 * An invalid, used or expired ticket is Django's 400 `{ code:
 * 'invalid_ticket' }`, returned as it is. Never cached: it is a write and
 * sets a cookie.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const { ticket } = await readValidatedBody(event, ZodBuilderSessionBody)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/builder/staff-session`, {
      method: 'POST',
      body: { ticket },
    })
    const session = await parseDataAs(response, ZodBuilderStaffSession)
    await writeBuilderSession(event, session)
    event.res.headers.set('Cache-Control', 'private, no-store')
    return { staff: session.staff, expiresAt: session.expiresAt } satisfies BuilderSessionInfo
  }
  catch (error) {
    return handleError(event, error)
  }
})
