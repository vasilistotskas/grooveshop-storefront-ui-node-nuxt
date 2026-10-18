import { describe, expect, it } from 'vitest'
import { eventStoreFeature } from '~~/server/utils/storeFeature'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { createRequestEvent } from '~~/test/helpers/nitro'

const eventFor = (tenant: unknown) => createRequestEvent({ context: { tenant } })

describe('eventStoreFeature', () => {
  const tenant = validTenantConfig('shop.test', {
    features: { ...validTenantConfig('shop.test').features, blog: true, wholesale: false },
    blogEnabled: false,
    b2bEnabled: true,
  })

  it('reads the request store\'s features, and only them', () => {
    expect(eventStoreFeature(eventFor(tenant), 'blog')).toBe(true)
    expect(eventStoreFeature(eventFor(tenant), 'wholesale')).toBe(false)
  })

  it('has no feature on a request no store resolved for', () => {
    expect(eventStoreFeature(eventFor(undefined), 'blog')).toBe(false)
  })
})
