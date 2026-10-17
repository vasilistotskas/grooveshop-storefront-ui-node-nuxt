import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { BROWSER_ACCEPT, requestWithHost } from '../helpers/e2e'

/**
 * Does an ad landing URL cost a render?
 *
 * Every `?gclid=…` was its own Nitro page-cache entry and its own full
 * SSR render, and the click id was written into the cached HTML
 * (`payload.path`, pagination links) for the next visitor. Production,
 * 2026-10-17 (issue #156): `/` is a Cloudflare HIT in ~35 ms, any query
 * string a MISS in 0.42-0.51 s.
 *
 * Only a real server shows it: the cache key is `req.originalUrl`, the
 * render reads `req.url`, and h3 resets a middleware's rewrite of the
 * second before the router runs — a unit test of the rewrite passes while
 * the cache still splits. So this drives real requests through the real
 * cache and counts what reaches the upstream.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

// Its own host, so every upstream request this suite counts is its own.
const HOST = 'tracking-params.localhost'

/** What the upstream saw for HOST, by arrival; the tenant lookup is not a render. */
const upstreamRequests: string[] = []

/** Counts HOST's requests; `false`, so the page-render stub still answers them. */
export function trackingParamsUpstream(req: IncomingMessage, _res: ServerResponse, reqUrl: URL): boolean {
  if (req.headers['x-forwarded-host'] === HOST && !reqUrl.pathname.endsWith('/tenant/resolve')) {
    upstreamRequests.push(reqUrl.pathname)
  }
  return false
}

const request = (path: string, host = HOST) => requestWithHost(path, host, BROWSER_ACCEPT)

/** Run `action` and say how many upstream requests it caused. */
async function upstreamCostOf(action: () => Promise<unknown>): Promise<number> {
  const before = upstreamRequests.length
  await action()
  return upstreamRequests.length - before
}

/**
 * Registered after the page renders, whose `beforeAll` waits for the
 * server. A `beforeAll` here would run after earlier tests, when
 * test-utils' `afterEach` has cleared the context its `url()` needs.
 */
export function describeTrackingParams(): void {
  describe('ad tags on a cached page URL', () => {
    it.each([
      ['/products', '/products?gclid=aaa', '/products?gclid=bbb&utm_source=google'],
      ['/en/blog', '/en/blog?fbclid=aaa', '/en/blog?utm_medium=cpc&gclid=bbb'],
      ['/products?sort=price', '/products?sort=price&gclid=aaa', '/products?gclid=bbb&sort=price'],
    ])('renders %s once for every tagged variant of it', async (clean, taggedA, taggedB) => {
      const first = await request(clean)
      expect(first.statusCode, first.body.slice(0, 900)).toBe(200)
      // The entry as the cache replays it: what every later visitor gets.
      const replay = await request(clean)

      let a: Awaited<ReturnType<typeof request>> | undefined
      let b: Awaited<ReturnType<typeof request>> | undefined
      expect(await upstreamCostOf(async () => {
        a = await request(taggedA)
        b = await request(taggedB)
      })).toBe(0)

      expect(a?.statusCode).toBe(200)
      expect(b?.statusCode).toBe(200)
      // Not just fast: the very page the untagged URL gets.
      expect(a?.body).toBe(replay.body)
      expect(b?.body).toBe(replay.body)
    }, 120000)

    it('costs the upstream nothing after the first render', async () => {
      await request('/blog?page=2')

      expect(await upstreamCostOf(async () => {
        await request('/blog?page=2&gclid=one')
        await request('/blog?page=2&gclid=two')
        await request('/blog?utm_source=x&page=2')
      })).toBe(0)
    }, 120000)

    it('never lets the render see a tag', async () => {
      const { body } = await request('/products?sort=price&gclid=secret-click-id&utm_source=secret-source')

      expect(body).not.toContain('secret-click-id')
      expect(body).not.toContain('secret-source')
      // The page was rendered for the URL without them: `payload.path`,
      // which the router starts from. The payload is devalue's JSON
      // array, with `/` escaped, so it is read rather than matched.
      const payload = /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(body)?.[1]
      expect(JSON.parse(payload ?? '[]')).toContain('/products?sort=price')
    }, 120000)

    it('keeps a param that decides the page', async () => {
      await request('/blog?page=2')
      const other = await upstreamCostOf(() => request('/blog?page=3&gclid=a'))

      expect(other).toBeGreaterThan(0)
    }, 120000)

    it('leaves a page that is not cached for everyone as it was asked for', async () => {
      const { body } = await request('/cart?gclid=kept-click-id')

      expect(body).toContain('kept-click-id')
    }, 120000)

    it('keeps the tags on a redirect, where the order attribution reads them from', async () => {
      const www = await request('/products?sort=price&gclid=abc', `www.${HOST}`)
      expect(www.statusCode).toBe(301)
      expect(www.location).toBe(`https://${HOST}/products?sort=price&gclid=abc`)

      const moved = await request('/home?utm_source=x&gclid=abc')
      expect(moved.statusCode).toBe(301)
      expect(moved.location).toBe('/?utm_source=x&gclid=abc')
    }, 120000)
  })
}
