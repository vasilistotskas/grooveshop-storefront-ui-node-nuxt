import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/session.get'
import { zUserDetails } from '~~/shared/openapi/zod.gen'
import type { BackendRequest } from '~~/test/helpers/nitro'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/_allauth/app/v1/auth/session: refreshes the visitor's allauth
 * session with the tokens their encrypted session holds, and stores what
 * allauth rotates.
 */

const route = '/api/_allauth/app/v1/auth/session'
const SESSION_URL = 'http://backend.test/_allauth/app/v1/auth/session'

const user = {
  pk: 5,
  id: 5,
  email: 'maria@example.com',
  twitter: null,
  linkedin: null,
  facebook: null,
  instagram: null,
  website: null,
  youtube: null,
  github: null,
  isActive: true,
  isStaff: false,
  isSuperuser: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  uuid: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  mainImagePath: '',
}

const authenticated = (meta: Record<string, unknown> = {}) => ({
  status: 200,
  data: {
    user: { id: 5, email: 'maria@example.com' },
    methods: [{ method: 'password', at: 1_700_000_000 }],
  },
  meta: { is_authenticated: true, ...meta },
})

/** Django: the allauth session endpoint, and the account the session refresh then loads. */
function djangoAnswers(session: unknown) {
  backend.reply((request: BackendRequest) =>
    request.path === SESSION_URL ? session : user,
  )
}

const sessionRequests = () => backend.requests.filter(request => request.path === SESSION_URL)

describe('GET /api/_allauth/app/v1/auth/session', () => {
  it('uses a user fixture the generated schema accepts', () => {
    expect(zUserDetails.safeParse(user).success).toBe(true)
  })

  it('asks allauth about the session with the tokens the visitor\'s session holds', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    djangoAnswers(authenticated())

    const response = await callRoute(handler, { route, headers: { 'x-forwarded-host': 'evil.example' } })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 200, meta: { is_authenticated: true } })
    const [sent] = sessionRequests()
    expect(sent!.method).toBe('GET')
    expect(sent!.headers.get('x-session-token')).toBe('sess-1')
    expect(sent!.headers.get('authorization')).toBe('Bearer knox-1')
    expect(sent!.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('stores the tokens allauth rotates and the account it loads in the session', async () => {
    testSession.set({ secure: { sessionToken: 'sess-old', accessToken: 'knox-old' } })
    djangoAnswers(authenticated({ session_token: 'sess-new' }))

    await callRoute(handler, { route })

    expect(testSession.data.secure).toEqual({ sessionToken: 'sess-new', accessToken: 'knox-old' })
    expect(testSession.data.user).toMatchObject({ id: 5, email: 'maria@example.com' })
  })

  it('clears the session when allauth reports the visitor signed out', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' }, user: { id: 5 } })
    djangoAnswers({ ...authenticated(), meta: { is_authenticated: false } })

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(200)
    expect(testSession.data).toEqual({})
  })

  it('clears the session and answers 410 when allauth expired it', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' }, user: { id: 5 } })
    backend.reply(jsonResponse({ status: 410, data: { flows: [] }, meta: { is_authenticated: false } }, 410))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(410)
    expect(testSession.data).toEqual({})
  })
})
