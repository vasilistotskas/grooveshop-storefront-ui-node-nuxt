import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { BROWSER_ACCEPT, requestWithHost, sendJson } from '../helpers/e2e'

/**
 * How many times does a request ask Django which store it is for?
 *
 * Every Nitro hook and plugin that reads the store asked on its own, and a
 * host that is not a store is never cached, so one request with an unknown
 * hostname cost Django dozens of `/tenant/resolve` 404s (production,
 * 2026-10-30: about 27,000 a day, from the kubelet's probes alone, which
 * name the pod's IP as Host). Only a real server shows every plugin and
 * hook of a request, so this drives real requests and counts what reaches
 * the upstream.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

const IP_HOST = '10.255.255.7'
const UNKNOWN_HOST = 'lookups-unknown.localhost'
const STORE_HOST = 'lookups-store.localhost'

/** The `domain` of every resolve call, by arrival. */
const resolveCalls: string[] = []

/** Counts every resolve call and answers 404 for the hosts that are no store; `false` for the rest, so the page-render stub resolves them. */
export function tenantLookupsUpstream(_req: IncomingMessage, res: ServerResponse, reqUrl: URL): boolean {
  if (!reqUrl.pathname.endsWith('/tenant/resolve')) return false
  const domain = reqUrl.searchParams.get('domain') ?? ''
  resolveCalls.push(domain)
  if (domain !== IP_HOST && domain !== UNKNOWN_HOST) return false
  sendJson(res, { detail: 'Not found.' }, 404)
  return true
}

/** Run `action` and say how many resolve calls it made for `host`. */
async function lookupsFor(host: string, action: () => Promise<unknown>): Promise<number> {
  const count = () => resolveCalls.filter(domain => domain === host).length
  const before = count()
  await action()
  return count() - before
}

const request = (path: string, host: string) => requestWithHost(path, host, BROWSER_ACCEPT)

export function describeTenantLookups(): void {
  describe('the tenant lookups a request makes', () => {
    it.each(['/api/_alive', '/_health'])('makes none for the probe %s, whose Host is an IP address', async (path) => {
      expect(await lookupsFor(IP_HOST, () => request(path, IP_HOST))).toBe(0)
    })

    it('makes none for any request whose Host is an IP address: it is never a store', async () => {
      expect(await lookupsFor(IP_HOST, () => request('/products', IP_HOST))).toBe(0)
    })

    it.each(['/health'])('answers %s, which nothing serves, with the plain "Store not found" on an unknown host, after one lookup', async (path) => {
      const answer = { status: 0, body: '' }
      const lookups = await lookupsFor(UNKNOWN_HOST, async () => {
        const response = await request(path, UNKNOWN_HOST)
        answer.status = response.statusCode
        answer.body = response.body
      })

      expect(answer.status).toBe(404)
      expect(answer.body).toContain('Store not found')
      expect(lookups).toBe(1)
    })

    it('answers /health on an IP host with the same plain 404, after no lookup', async () => {
      const answer = { status: 0, body: '' }
      const lookups = await lookupsFor(IP_HOST, async () => {
        const response = await request('/health', IP_HOST)
        answer.status = response.statusCode
        answer.body = response.body
      })

      expect(answer.status).toBe(404)
      expect(answer.body).toContain('Store not found')
      expect(lookups).toBe(0)
    })

    it('gives a store its normal 404 for /health', async () => {
      const response = await request('/health', STORE_HOST)

      expect(response.statusCode).toBe(404)
      expect(response.body).not.toContain('Store not found')
    })

    it('makes exactly one for a page on a hostname that is no store', async () => {
      const response = { status: 0 }
      const lookups = await lookupsFor(UNKNOWN_HOST, async () => {
        response.status = (await request('/products', UNKNOWN_HOST)).statusCode
      })

      expect(response.status).toBe(404)
      expect(lookups).toBe(1)
    })

    it('makes at most one for a known store per cache window, however many requests', async () => {
      const lookups = await lookupsFor(STORE_HOST, async () => {
        await request('/products', STORE_HOST)
        await request('/robots.txt', STORE_HOST)
        await request('/manifest.webmanifest', STORE_HOST)
      })

      expect(lookups).toBeLessThanOrEqual(1)
    })

    it('makes exactly one for /llms.txt on a hostname that is no store', async () => {
      const lookups = await lookupsFor(UNKNOWN_HOST, () => request('/llms.txt', UNKNOWN_HOST))

      expect(lookups).toBe(1)
    })
  })
}
