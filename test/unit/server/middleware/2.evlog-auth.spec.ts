/**
 * The user id goes on the wide event for a signed-in visitor, and an
 * anonymous visitor's session is never read (reading it would mint one
 * and send them a cookie).
 */
import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/2.evlog-auth'
import { callHandler, createTestEvent, loggerOf, testSession } from '~~/test/helpers/nitro'

const SESSION_COOKIE = { cookie: 'nuxt-session=sealed' }

async function run(url: string, headers: Record<string, string> = {}) {
  const event = createTestEvent({ url, headers })
  await callHandler(middleware, event)
  return loggerOf(event).fields
}

describe('server/middleware/2.evlog-auth', () => {
  it('never reads the session of a visitor who has none', async () => {
    testSession.set({ user: { id: 42 } })

    expect(await run('/')).toEqual({})
  })

  it('records a signed-in visitor\'s user id', async () => {
    testSession.set({ user: { id: 42, email: 'a@b.test' } })

    expect(await run('/', SESSION_COOKIE)).toEqual({ user: { id: 42 } })
  })

  it('reads a session sent in the session header too', async () => {
    testSession.set({ user: { id: 7 } })

    expect(await run('/', { 'x-nuxt-session-session': 'sealed' })).toEqual({ user: { id: 7 } })
  })

  it('records nothing for a session without a user (a cart-only visitor)', async () => {
    testSession.set({ cartId: 3 })

    expect(await run('/', SESSION_COOKIE)).toEqual({})
  })

  it.each(['/_nuxt/app.js', '/_ipx/w_200/x.png', '/assets/x.css'])('skips %s even with a session', async (url) => {
    testSession.set({ user: { id: 42 } })

    expect(await run(url, SESSION_COOKIE)).toEqual({})
  })
})
