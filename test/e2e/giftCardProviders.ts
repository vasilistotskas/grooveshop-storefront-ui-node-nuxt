import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { makePayWay } from '../fixtures/payWay'
import { validTenantConfig } from '../fixtures/tenantConfig'
import { BROWSER_ACCEPT, requestWithHost, sendJson, markupWithoutScriptsAndStyles } from '../helpers/e2e'

/**
 * Does the gift card page choose its payment method in the server HTML?
 *
 * The page offers every online processor the store's pay ways name, and the
 * first is the one chosen until the shopper picks another. The choice was
 * copied from the list by a watcher, which a server render never runs again
 * once the list has been read, so the HTML offered the methods with none
 * chosen and the browser then chose one (a hydration mismatch). Only a real
 * server render shows it.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

// Webside's form offers the methods on its first step. The default design asks
// on the review step, which is no part of the server HTML, so only the state
// differs there; the shared composable (`useGiftCardPurchase`) is fixed for both.
const DESIGNS = [
  ['the webside design', 'gift-cards-webside.localhost', 'webside'],
] as const

/** The stores' upstream: gift cards and the catalogue on, two online card processors; everything else falls through to the page-render stub. */
export function giftCardProvidersUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  const domain = url.searchParams.get('domain') ?? ''
  const design = DESIGNS.find(([, host]) => host === (domain || req.headers['x-forwarded-host']))
  if (!design) return false

  if (url.pathname.endsWith('/tenant/resolve')) {
    const config = validTenantConfig(domain)
    sendJson(res, validTenantConfig(domain, {
      schemaName: design[2],
      stripePublishableKey: 'pk_test_e2e',
      features: { ...config.features, giftCards: true, catalogue: true },
    }))
    return true
  }
  if (url.pathname === '/api/v1/pay_way') {
    const results = [
      makePayWay({ id: 1, key: 'VIVA_WALLET', providerCode: 'viva_wallet', settlement: 'online' }),
      makePayWay({ id: 2, key: 'STRIPE', providerCode: 'stripe', settlement: 'online' }),
    ]
    sendJson(res, { count: results.length, links: { next: null, previous: null }, results })
    return true
  }
  return false
}

export function describeGiftCardProviders(): void {
  describe.each(DESIGNS)('the gift card page in %s', (_name, host) => {
    it('has the first payment method chosen in the HTML the server sends', async () => {
      const page = await requestWithHost('/gift-cards', host, BROWSER_ACCEPT)
      // Scripts are dropped: the page payload carries the same text, so an unstripped check would pass on a page whose HTML lacks it.
      const html = markupWithoutScriptsAndStyles(page.body)

      expect(page.statusCode, html.slice(0, 1500)).toBe(200)
      const methods = html.match(/<button[^>]*role="radio"[^>]*value="(?:viva_wallet|stripe)"[^>]*>/g) ?? []
      expect(methods, 'both methods are offered').toHaveLength(2)
      const chosen = methods.filter(method => method.includes('aria-checked="true"'))
      expect(chosen, 'one of them is chosen').toHaveLength(1)
      // The first the store offers (Viva Wallet, first in its pay ways), not whichever is last.
      expect(chosen[0], 'the first offered').toContain('value="viva_wallet"')
    }, 120000)
  })
}
