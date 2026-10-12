import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { getTenantConfig } from '~~/server/utils/tenant'
import plugin from '~~/server/plugins/evlog-client-drain'
import { runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * evlog's ingest route hands a browser event to `evlog:drain` and prints
 * nothing, so the drain is the only thing that puts it on stdout. Server
 * events reach the same hook already printed, and must not print twice.
 */
vi.mock('~~/server/utils/tenant', async importOriginal => ({
  ...await importOriginal<typeof import('~~/server/utils/tenant')>(),
  getTenantConfig: vi.fn(),
}))

const request = { method: 'POST', path: '/api/_evlog/ingest' }

async function drain(event: Record<string, unknown>, headers: Record<string, string> = { host: 'shop.test' }) {
  const nitroApp = await runNitroPlugin(plugin)
  await nitroApp.hooks.callHook('evlog:drain', { event, request, headers })
}

describe('server/plugins/evlog-client-drain', () => {
  let spies: Record<'log' | 'warn' | 'error', MockInstance>

  // Spies are restored before every test (`restoreMocks`), so they are
  // installed per test, not once at describe time.
  beforeEach(() => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'ok', config: validTenantConfig('shop.test', { schemaName: 'shop', name: 'Shop' }) })
    spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  it.each([
    ['info', 'log'],
    ['debug', 'log'],
    ['warn', 'warn'],
    ['error', 'error'],
  ] as const)('prints a client %s event as one JSON line on console.%s', async (level, method) => {
    const event = { level, source: 'client', tag: 'cart', message: 'cart:setup:signed-in-without-cart', service: 'grooveshop-storefront' }

    await drain(event)

    expect(spies[method]).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ ...event, tenantSchema: 'shop', tenantName: 'Shop' }))
    expect(Object.values(spies).reduce((calls, spy) => calls + spy.mock.calls.length, 0)).toBe(1)
  })

  it.each([
    ['no source', { level: 'error', method: 'GET', path: '/' }],
    ['a server source', { level: 'error', source: 'server' }],
  ])('ignores an event with %s (evlog printed it already)', async (_name, event) => {
    await drain(event)

    expect(Object.values(spies).reduce((calls, spy) => calls + spy.mock.calls.length, 0)).toBe(0)
  })

  it('names the store the event came from, resolved from the request host', async () => {
    await drain({ level: 'warn', source: 'client', tag: 'cart' }, { host: 'Shop.Test:443' })

    expect(getTenantConfig).toHaveBeenCalledWith('shop.test')
    expect(spies.warn).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ level: 'warn', source: 'client', tag: 'cart', tenantSchema: 'shop', tenantName: 'Shop' }))
  })

  it('still prints the event, without a store, when the host resolves to none', async () => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'not_found', config: null })
    const event = { level: 'warn', source: 'client' }

    await drain(event)

    expect(spies.warn).toHaveBeenCalledExactlyOnceWith(JSON.stringify(event))
  })
})
