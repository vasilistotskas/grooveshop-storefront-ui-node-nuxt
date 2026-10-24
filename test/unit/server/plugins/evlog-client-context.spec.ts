import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { getTenantConfig } from '~~/server/utils/tenant'
import plugin from '~~/server/plugins/evlog-client-context'
import { runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * evlog's ingest route runs `evlog:enrich` on a browser event BEFORE it
 * prints it, so a field set there lands on the stdout line. Server events
 * reach the same hook already printed, and carry their store from
 * `0.tenant.ts` and their browser from `2.evlog-client.ts`, so they are
 * left alone.
 */
vi.mock('~~/server/utils/tenant', async importOriginal => ({
  ...await importOriginal<typeof import('~~/server/utils/tenant')>(),
  getTenantConfig: vi.fn(),
}))

const request = { method: 'POST', path: '/api/_evlog/ingest' }

async function enrich(event: Record<string, unknown>, headers: Record<string, string> = { host: 'shop.test' }) {
  const nitroApp = await runNitroPlugin(plugin)
  await nitroApp.hooks.callHook('evlog:enrich', { event, request, headers })
  return event
}

const SAFARI_15 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1'

describe('server/plugins/evlog-client-context', () => {
  beforeEach(() => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'ok', config: validTenantConfig('shop.test', { schemaName: 'shop', name: 'Shop' }) })
  })

  it('names the store a client event came from', async () => {
    const event = await enrich({ level: 'warn', source: 'client', tag: 'cart' })

    expect(event).toEqual({ level: 'warn', source: 'client', tag: 'cart', tenantSchema: 'shop', tenantName: 'Shop' })
  })

  it('strips the body of a failed call to field names and codes, for a client event only', async () => {
    const body = { email: ['x@y.z is taken'] }
    const client = await enrich({ source: 'client', error: { name: 'FetchError', message: 'm', data: body } })
    const server = await enrich({ source: 'server', error: { name: 'FetchError', message: 'm', data: { email: ['x@y.z is taken'] } } })

    expect(client.error).toMatchObject({ data: { email: ['<redacted:body>'] } })
    expect(JSON.stringify(client)).not.toContain('x@y.z')
    expect(server.error).toMatchObject({ data: { email: ['x@y.z is taken'] } })
  })

  it('prints a store site\'s fetch that got no response at warn, a real failure at error', async () => {
    const offline = await enrich({ level: 'error', source: 'client', action: 'cart:setup', error: { name: 'FetchError', message: '[GET] "/api/cart": <no response> Load failed', cause: { name: 'TypeError', message: 'Load failed' } } })
    const failed = await enrich({ level: 'error', source: 'client', action: 'cart:setup', error: { name: 'FetchError', message: '[GET] "/api/cart": 500', statusCode: 500, status: 500, data: { detail: 'boom' } } })

    expect(offline.level).toBe('warn')
    expect(failed.level).toBe('error')
  })

  it('cuts a browser\'s INP report back to the report\'s own fields', async () => {
    const event = await enrich({
      source: 'client',
      action: 'client:inp',
      inp: { value: 412, rating: 'poor', loadState: 'complete', inputDelay: 10, processingDuration: 360, presentationDelay: 42, longAnimationFrames: 1, email: 'x@y.z' },
    })

    expect(event.inp).toEqual({ value: 412, rating: 'poor', loadState: 'complete', inputDelay: 10, processingDuration: 360, presentationDelay: 42, longAnimationFrames: 1 })
  })

  it('names the browser it came from, as server events do, never the raw User-Agent', async () => {
    const event = await enrich({ level: 'error', source: 'client' }, { 'host': 'shop.test', 'user-agent': SAFARI_15, 'cf-ipcountry': 'GR' })

    expect(event.client).toEqual({ browser: 'Safari 15', os: 'iOS', bot: false, country: 'GR' })
    expect(JSON.stringify(event)).not.toContain('Mozilla')
  })

  it('resolves the store from the request host, port and case dropped', async () => {
    await enrich({ level: 'warn', source: 'client' }, { host: 'Shop.Test:443' })

    expect(getTenantConfig).toHaveBeenCalledWith('shop.test')
  })

  it.each([
    ['no source', { level: 'error', method: 'GET', path: '/' }],
    ['a server source', { level: 'error', source: 'server' }],
  ])('leaves an event with %s alone', async (_name, event) => {
    const before = { ...event }

    expect(await enrich(event)).toEqual(before)
    expect(getTenantConfig).not.toHaveBeenCalled()
  })

  it('leaves the event without a store when the host resolves to none', async () => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'not_found', config: null })
    const event = { level: 'warn', source: 'client' }

    expect(await enrich(event)).toEqual({ level: 'warn', source: 'client' })
  })

  it('leaves the event alone when the request carries no host', async () => {
    const event = { level: 'warn', source: 'client' }

    expect(await enrich(event, {})).toEqual({ level: 'warn', source: 'client' })
    expect(getTenantConfig).not.toHaveBeenCalled()
  })
})
