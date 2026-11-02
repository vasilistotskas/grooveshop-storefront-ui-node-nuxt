import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/features.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'
import { zStoreFeatureStates } from '~~/shared/openapi/zod.gen'

const route = '/api/builder/features'

const features = (cookie?: string) => callRoute(handler, { route, headers: cookie ? { cookie } : {} })

/** Every store feature on, as the generated schema names them, but the newsletter: off, with where this ADMIN turns it on. */
const ANSWER = {
  features: Object.fromEntries(Object.keys(zStoreFeatureStates.shape).map(name => [name, name === 'newsletter'
    ? { on: false, turnOnUrl: 'https://api.webside.gr/el/admin/extra_settings/setting/12/change/' }
    : { on: true, turnOnUrl: null }])),
}

describe('GET /api/builder/features', () => {
  it('asks Django which features are on and where this staff member turns one on, as them', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(ANSWER)

    const response = await features(cookie)

    expect(response.status).toBe(200)
    expect(response.body.features.newsletter).toEqual(ANSWER.features.newsletter)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/features')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a request without a staff session, and asks Django nothing', async () => {
    const response = await features()

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns Django\'s refusal as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'staff_token_scope' }, 403))

    const response = await features(cookie)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ detail: 'staff_token_scope' })
  })
})
