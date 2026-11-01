import { defineEventHandler } from 'nuxt/server'

/**
 * Who is signed in to the page builder on this host: `{ staff, expiresAt }`,
 * or 401 for a request without a live staff session. The editor asks when
 * it opens without a ticket (a reload, a second tab). Never the token,
 * never cached.
 */
export default defineEventHandler(async (event) => {
  try {
    const { staff, expiresAt } = await requireBuilderStaff(event)
    event.res.headers.set('Cache-Control', 'private, no-store')
    return { staff, expiresAt } satisfies BuilderSessionInfo
  }
  catch (error) {
    return handleError(event, error)
  }
})
