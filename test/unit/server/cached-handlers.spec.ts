/// <reference types="vite/client" />
/**
 * The cache-key contract, over EVERY `defineCachedEventHandler` route.
 *
 * Nitro serves a cached handler's entry to any request whose key
 * matches. A key without the tenant host serves one store's data to
 * another (the P0 leak `tenantCacheKey` exists to prevent); a key
 * without the locale serves an English entry to a Greek page, because
 * Django answers in the `X-Language` it is sent. And the host must be
 * the request's `Host` — a caller-supplied `X-Forwarded-Host` choosing
 * the key would let anyone read or poison another store's entries.
 *
 * Found by reading the sources, so a new cached route is covered the
 * day it is added. Per-route specs assert only what is particular to a
 * route (its params and query dimensions).
 */
import { describe, expect, it } from 'vitest'
import type { EventHandler } from 'h3'
import { cacheOptionsOf, createTestEvent } from '~~/test/helpers/nitro'

const sources = import.meta.glob<string>('/server/{api,routes}/**/*.ts', { query: '?raw', import: 'default', eager: true })
const modules = import.meta.glob<{ default: EventHandler }>('/server/{api,routes}/**/*.ts')

const CACHED = /\bdefineCachedEventHandler\s*\(/

const cachedFiles = Object.keys(sources)
  .filter(file => CACHED.test(sources[file]!))
  .sort()

/** Every `[param]` in the file's path, so getKeys that read router params get one. */
function paramsOf(file: string): Record<string, string> {
  return Object.fromEntries([...file.matchAll(/\[([^\]]+)\]/g)].map(([, name]) => [name!, '1']))
}

async function keyFor(file: string, host: string, locale: string): Promise<string> {
  const { default: handler } = await modules[file]!()
  const event = createTestEvent({
    host,
    url: '/',
    headers: { 'x-forwarded-host': 'evil.example' },
    context: { locale, params: paramsOf(file) },
  })
  return cacheOptionsOf(handler).getKey!(event)
}

describe('every cached route handler', () => {
  it('is found by the source scan', () => {
    // A broken glob would make every assertion below vacuous. 43 on
    // 2026-09-30; raise the floor when a cached route is added.
    expect(cachedFiles.length).toBeGreaterThanOrEqual(43)
    expect(cachedFiles).toContain('/server/api/products/[id]/reviews.get.ts')
  })

  it.each(cachedFiles)('%s keys its cache on the request Host and locale', async (file) => {
    const greekA = await keyFor(file, 'store-a.test', 'el')
    const greekB = await keyFor(file, 'store-b.test', 'el')
    const englishA = await keyFor(file, 'store-a.test', 'en')

    expect(greekA).not.toBe(greekB)
    expect(greekA).not.toBe(englishA)
    expect(greekA.startsWith('store-a.test__el__')).toBe(true)
    expect(englishA.startsWith('store-a.test__en__')).toBe(true)
    expect(greekA).not.toContain('evil.example')
  })
})
