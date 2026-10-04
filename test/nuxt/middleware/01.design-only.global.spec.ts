import { describe, it, expect } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import designOnly from '~/middleware/01.design-only.global'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A page only the redesigned storefront has (the account's Security
 * page): a store frozen in the previous design has no body for it and
 * never links to it, so there it is not found — signed in or not, since
 * this runs before the sign-in redirect.
 */
const route = (name: string, path: string) => ({ name, path, fullPath: path }) as RouteLocationNormalized
const SECURITY = route('account-security___el', '/account/security')
const ORDERS = route('account-orders___el', '/account/orders')

describe('design-only middleware', () => {
  it.each(['demo', 'ekfyseosfyteias'])('serves the page to %s, drawn in the redesign', (schemaName) => {
    setTenant({ schemaName })

    expect(designOnly(SECURITY, SECURITY)).toBeUndefined()
  })

  it('404s on the store frozen in the previous design', () => {
    setTenant({ schemaName: 'webside' })

    expect(() => designOnly(SECURITY, SECURITY)).toThrow(expect.objectContaining({ statusCode: 404 }))
  })

  it('leaves every other page to the frozen store', () => {
    setTenant({ schemaName: 'webside' })

    expect(designOnly(ORDERS, ORDERS)).toBeUndefined()
  })
})
