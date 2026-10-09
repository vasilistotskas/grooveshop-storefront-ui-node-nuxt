import { describe, expect, it } from 'vitest'
import { requestTenantHost, resolveTenantHost } from '~~/server/utils/tenantHost'
import { createRequestEvent, createTestEvent } from '~~/test/helpers/nitro'

/**
 * The store a request is for, as everything keyed on it must name it:
 * the resolver, the caches, the rate limits and Django. A Host differing
 * only in case or port is the same store.
 */
describe('resolveTenantHost', () => {
  it.each([
    ['a bare host', 'webside.gr', 'webside.gr'],
    ['a port', 'webside.gr:443', 'webside.gr'],
    ['upper case', 'WebSide.GR', 'webside.gr'],
    ['both', 'WEBSIDE.gr:3000', 'webside.gr'],
    ['an IPv6 literal with a port', '[::1]:3000', '[::1]'],
  ])('names the store for %s', (_label, host, expected) => {
    expect(resolveTenantHost(createRequestEvent({ host }))).toBe(expected)
  })

  it('never reads X-Forwarded-Host, which the client controls', () => {
    expect(resolveTenantHost(createRequestEvent({ host: 'webside.gr', headers: { 'x-forwarded-host': 'evil.example' } }))).toBe('webside.gr')
  })
})

/**
 * Read from the context the tenant middleware fills, so the h3 event
 * Nitro hands cache keys and plugins names the same store as a route's.
 */
describe('requestTenantHost', () => {
  it('reads the store the tenant middleware resolved, on either event', () => {
    expect(requestTenantHost(createRequestEvent({ context: { tenantHost: 'webside.gr' } }))).toBe('webside.gr')
    expect(requestTenantHost(createTestEvent({ context: { tenantHost: 'webside.gr' } }))).toBe('webside.gr')
  })

  it('refuses a request the tenant middleware never saw, rather than guess a store', () => {
    expect(() => requestTenantHost(createTestEvent({ context: { tenantHost: undefined } }))).toThrow(/tenant host/)
  })
})
