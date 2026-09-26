/**
 * The user id goes on the wide event for a signed-in visitor, and an
 * anonymous visitor's session is never read (reading it would mint one
 * and send them a cookie).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let hasSession = false
const getUserSession = vi.fn()
const loggerSet = vi.fn()
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('requestHasSession', () => hasSession)
vi.stubGlobal('getUserSession', getUserSession)
vi.stubGlobal('useLogger', () => ({ set: loggerSet }))

const { default: handler } = await import('../../../../server/middleware/2.evlog-auth')
const run = (path = '/') => (handler as unknown as (event: unknown) => Promise<void>)({ path })

describe('2.evlog-auth middleware', () => {
  beforeEach(() => {
    hasSession = false
    getUserSession.mockReset()
    loggerSet.mockReset()
  })

  it('never reads the session of a visitor who has none', async () => {
    await run()
    expect(getUserSession).not.toHaveBeenCalled()
    expect(loggerSet).not.toHaveBeenCalled()
  })

  it('records a signed-in visitor\'s user id', async () => {
    hasSession = true
    getUserSession.mockResolvedValue({ user: { id: 42 } })
    await run()
    expect(loggerSet).toHaveBeenCalledWith({ user: { id: 42 } })
  })

  it('records nothing for a session without a user (a cart-only visitor)', async () => {
    hasSession = true
    getUserSession.mockResolvedValue({})
    await run()
    expect(loggerSet).not.toHaveBeenCalled()
  })

  it('skips build assets and images even with a session', async () => {
    hasSession = true
    for (const path of ['/_nuxt/app.js', '/_ipx/w_200/x.png', '/assets/x.css']) await run(path)
    expect(getUserSession).not.toHaveBeenCalled()
  })
})
