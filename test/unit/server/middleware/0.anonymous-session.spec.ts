/**
 * A visitor without a session asks nuxt-auth-utils' session route on
 * every cached page; they get the empty session from here, and no
 * session is created for them. A visitor with one goes on to the module.
 */
import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/0.anonymous-session'
import { callHandler, createTestEvent, testSession } from '~~/test/helpers/nitro'

const run = (url: string, method = 'GET') => callHandler(middleware, createTestEvent({ url, method }))

describe('server/middleware/0.anonymous-session', () => {
  it('answers a visitor without a session with the empty session, creating none', async () => {
    expect(await run('/api/_auth/session')).toEqual({})
    expect(testSession.minted).toBe(0)
  })

  it('leaves a visitor with a session to the module', async () => {
    testSession.set({ user: { id: 42 } })

    expect(await run('/api/_auth/session')).toBeUndefined()
  })

  it.each([
    ['DELETE', '/api/_auth/session'],
    ['GET', '/api/_auth/session/other'],
    ['GET', '/'],
  ])('lets %s %s through', async (method, url) => {
    expect(await run(url, method)).toBeUndefined()
  })
})
