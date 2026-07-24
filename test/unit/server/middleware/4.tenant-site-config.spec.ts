/**
 * Unit tests for server/middleware/4.tenant-site-config.ts
 *
 * This is a read-back test: it asserts that `getSiteConfig(event)` RETURNS
 * the tenant's values after the middleware runs, not merely that
 * `updateSiteConfig` was called. A previous implementation assigned a
 * plain object directly to `event.context.siteConfig`, which silently
 * broke every consumer even though the middleware itself "ran fine".
 *
 * `updateSiteConfig`/`getSiteConfig` are nuxt-site-config auto-imports
 * backed by `site-config-stack`'s `createSiteConfigStack()` — a stack of
 * config layers resolved by priority, where equal-priority layers resolve
 * in push (insertion) order (site-config-stack@4.1.x `get()`). Neither
 * that internal algorithm nor the composables are part of the package's
 * public `exports` map, so this test reimplements the same push/get
 * priority-resolution semantics locally rather than reaching into a
 * pnpm-hash-dependent dist path.
 */
import { describe, it, expect, vi } from 'vitest'

const RUNTIME_PRIORITY = 0

function createFakeSiteConfigStack() {
  const stack: Array<Record<string, unknown>> = []
  return {
    push(input: Record<string, unknown>) {
      stack.push(input)
    },
    get() {
      const resolved: Record<string, unknown> = {}
      // Stable sort by priority ascending; equal-priority entries keep
      // insertion order, and later entries win for the same key —
      // mirrors site-config-stack's `get()`.
      const sorted = [...stack].sort((a, b) =>
        ((a._priority as number) ?? RUNTIME_PRIORITY) - ((b._priority as number) ?? RUNTIME_PRIORITY),
      )
      for (const entry of sorted) {
        for (const key of Object.keys(entry)) {
          if (key.startsWith('_')) continue
          resolved[key] = entry[key]
        }
      }
      return resolved
    },
  }
}

function fakeUpdateSiteConfig(event: { context: { siteConfig?: ReturnType<typeof createFakeSiteConfigStack> } }, input: Record<string, unknown>) {
  event.context.siteConfig = event.context.siteConfig || createFakeSiteConfigStack()
  event.context.siteConfig.push(input)
}

function fakeGetSiteConfig(event: { context: { siteConfig?: ReturnType<typeof createFakeSiteConfigStack> } }) {
  event.context.siteConfig = event.context.siteConfig || createFakeSiteConfigStack()
  return event.context.siteConfig.get()
}

vi.stubGlobal('updateSiteConfig', fakeUpdateSiteConfig)
vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

const module = await import('../../../../server/middleware/4.tenant-site-config')
const handler = (module.default ?? module) as unknown as (event: unknown) => void

function makeEventWithRuntimeConfig(tenant?: Record<string, unknown>) {
  const event = {
    context: {
      tenant,
      siteConfig: createFakeSiteConfigStack(),
    },
  }
  // Simulate nuxt-site-config's own `init` middleware, which runs before
  // route-scoped user middleware and pushes the platform-wide config at
  // the "runtime" priority tier (SiteConfigPriority.runtime = 0).
  event.context.siteConfig.push({
    _context: 'runtimeEnv',
    _priority: RUNTIME_PRIORITY,
    url: 'https://webside.gr',
    name: 'Webside',
    description: 'Platform-wide description',
  })
  return event
}

describe('4.tenant-site-config middleware', () => {
  it('does nothing when there is no tenant context', () => {
    const event = makeEventWithRuntimeConfig(undefined)
    handler(event)
    expect(fakeGetSiteConfig(event)).toMatchObject({ url: 'https://webside.gr', name: 'Webside' })
  })

  it('does nothing when the tenant has no primaryDomain', () => {
    const event = makeEventWithRuntimeConfig({ storeName: 'Acme' })
    handler(event)
    expect(fakeGetSiteConfig(event)).toMatchObject({ url: 'https://webside.gr', name: 'Webside' })
  })

  it('getSiteConfig returns the tenant url and name after the middleware runs', () => {
    const event = makeEventWithRuntimeConfig({
      primaryDomain: 'acme.example',
      storeName: 'Acme Store',
      name: 'acme',
    })
    handler(event)

    const resolved = fakeGetSiteConfig(event)
    expect(resolved.url).toBe('https://acme.example')
    expect(resolved.name).toBe('Acme Store')
  })

  it('falls back to tenant.name when storeName is empty', () => {
    const event = makeEventWithRuntimeConfig({
      primaryDomain: 'acme.example',
      storeName: '',
      name: 'acme',
    })
    handler(event)

    expect(fakeGetSiteConfig(event).name).toBe('acme')
  })

  it('overrides description when the tenant provides one', () => {
    const event = makeEventWithRuntimeConfig({
      primaryDomain: 'acme.example',
      storeName: 'Acme Store',
      storeDescription: 'Acme tenant description',
    })
    handler(event)

    expect(fakeGetSiteConfig(event).description).toBe('Acme tenant description')
  })

  it('falls through to the platform-wide description when the tenant has none', () => {
    const event = makeEventWithRuntimeConfig({
      primaryDomain: 'acme.example',
      storeName: 'Acme Store',
    })
    handler(event)

    // Not overridden — the platform-wide runtimeEnv value survives.
    expect(fakeGetSiteConfig(event).description).toBe('Platform-wide description')
  })
})
