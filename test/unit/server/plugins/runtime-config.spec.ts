/**
 * Every request must get its own copy of the boot-resolved runtime config,
 * so Nitro never re-applies the environment to a fresh clone per request
 * (63% of a trivial request's CPU, profiled 2026-09-25).
 */
import { describe, expect, it, vi } from 'vitest'

const resolved = Object.freeze({
  apiBaseUrl: 'http://backend-service:80/api/v1',
  public: Object.freeze({ i18n: Object.freeze({ defaultLocale: 'el' }) }),
})

vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => resolved)

const { default: plugin } = await import('../../../../server/early-plugins/runtime-config')

function setup() {
  let onRequest: ((event: any) => void) | undefined
  plugin({ hooks: { hook: (name: string, fn: (event: any) => void) => { if (name === 'request') onRequest = fn } } } as any)
  return (context: Record<string, any> = {}) => {
    const event = { context: { nitro: { errors: [], ...context } } }
    onRequest!(event)
    return event.context.nitro.runtimeConfig
  }
}

describe('runtime-config early plugin', () => {
  it('seeds the request with the resolved values', () => {
    expect(setup()()).toEqual(resolved)
  })

  it('gives each request its own writable copy', () => {
    const request = setup()
    const first = request()
    const second = request()
    expect(first).not.toBe(resolved)
    expect(first).not.toBe(second)
    first.public.i18n.defaultLocale = 'en'
    expect(second.public.i18n.defaultLocale).toBe('el')
    expect(resolved.public.i18n.defaultLocale).toBe('el')
  })

  it('never replaces a copy other code already holds', () => {
    const existing = { already: true }
    expect(setup()({ runtimeConfig: existing })).toBe(existing)
  })
})
