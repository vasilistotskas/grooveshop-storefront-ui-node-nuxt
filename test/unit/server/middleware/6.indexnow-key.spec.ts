import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/6.indexnow-key'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callHandler, createRequestEvent } from '~~/test/helpers/nitro'

const KEY = 'a1b2c3d4e5f60718'

async function request(url: string, indexnowKey = KEY) {
  const event = createRequestEvent({ url, host: 'tenant.example' })
  event.context.tenant = validTenantConfig('tenant.example', { indexnowKey })
  const body = await callHandler(middleware, event as never)
  return { body, contentType: event.res.headers.get('content-type') }
}

describe('server/middleware/6.indexnow-key', () => {
  it('answers the store\'s own key file with the key, as plain text', async () => {
    expect(await request(`/${KEY}.txt`)).toEqual({ body: KEY, contentType: 'text/plain; charset=utf-8' })
  })

  it.each([
    ['another key', '/ffffffffffffffff.txt'],
    ['a page', '/products'],
    ['the key under a path', `/products/${KEY}.txt`],
  ])('leaves %s alone', async (_case, url) => {
    expect((await request(url)).body).toBeUndefined()
  })

  it('serves nothing for a store with IndexNow off', async () => {
    expect((await request('/.txt', '')).body).toBeUndefined()
  })
})
