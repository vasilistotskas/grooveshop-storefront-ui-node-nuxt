import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/link-search.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/link-search'

const search = (url: string, cookie?: string) => callRoute(handler, { route, url, headers: cookie ? { cookie } : {} })

const RESULTS = {
  results: [
    { kind: 'product', id: 12, label: 'Φορτιστής 20W', slug: 'fortistis-20w', active: true },
    { kind: 'page', id: 'summer-sale', label: 'Καλοκαιρινές προσφορές', slug: 'summer-sale', active: true, source: 'page' },
  ],
}

describe('GET /api/builder/link-search', () => {
  it('asks Django for what matches, in the kinds asked for, in the editor\'s language, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(RESULTS)

    const response = await search(`${route}?q=fort&kinds=product,page`, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(RESULTS)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/link-search')
    expect(backend.lastRequest.query).toEqual({ q: 'fort', kinds: 'product,page', locale: 'el' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('names the editor\'s language itself, whatever the address says', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce({ results: [] })

    await search(`${route}?q=fort&locale=en`, cookie)

    expect(backend.lastRequest.query).toEqual({ q: 'fort', locale: 'el' })
  })

  it('refuses a request without a staff session, and asks Django nothing', async () => {
    const response = await search(`${route}?q=fort`)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns Django\'s refusal as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'kinds must be a comma-separated list', code: 'invalid', param: 'kinds' }, 400))

    const response = await search(`${route}?kinds=shoes`, cookie)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ detail: 'kinds must be a comma-separated list', code: 'invalid', param: 'kinds' })
  })
})
