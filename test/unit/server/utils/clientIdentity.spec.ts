import { describe, expect, it } from 'vitest'
import { clientIdentityHeaders } from '~~/server/utils/clientIdentity'
import { createRequestEvent } from '~~/test/helpers/nitro'

/**
 * Django believes a client IP only alongside the edge's `X-Origin-Verify`
 * and keys every per-caller throttle on it, so these headers decide
 * whether a throttle limits one visitor or a whole store. `createHeaders`
 * and `useBackendFetch` both merge this in; their specs assert the merge.
 */
describe('clientIdentityHeaders', () => {
  it.each([
    ['CF-Connecting-IP over everything', { 'cf-connecting-ip': '203.0.113.1', 'true-client-ip': '203.0.113.2', 'x-forwarded-for': '203.0.113.3' }, '203.0.113.1'],
    ['True-Client-IP when Cloudflare sent no CF-Connecting-IP', { 'true-client-ip': '203.0.113.2', 'x-forwarded-for': '203.0.113.3' }, '203.0.113.2'],
    ['the first X-Forwarded-For hop next', { 'x-forwarded-for': '203.0.113.3, 10.0.0.1' }, '203.0.113.3'],
  ])('takes X-Real-IP from %s', (_label, headers, ip) => {
    expect(clientIdentityHeaders(createRequestEvent({ headers, remoteAddress: '10.0.0.9' }))['X-Real-IP']).toBe(ip)
  })

  it('falls back to the socket peer', () => {
    expect(clientIdentityHeaders(createRequestEvent({ remoteAddress: '10.0.0.9' }))['X-Real-IP']).toBe('10.0.0.9')
  })

  it('sends no X-Real-IP when nothing identifies the caller', () => {
    expect(clientIdentityHeaders(createRequestEvent())).not.toHaveProperty('X-Real-IP')
  })

  it('relays User-Agent, X-Forwarded-For and X-Origin-Verify verbatim', () => {
    const headers = clientIdentityHeaders(createRequestEvent({
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)',
        'x-forwarded-for': '203.0.113.3, 10.0.0.1',
        'x-origin-verify': 'edge-secret',
      },
    }))

    expect(headers).toEqual({
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)',
      'X-Real-IP': '203.0.113.3',
      'X-Forwarded-For': '203.0.113.3, 10.0.0.1',
      'X-Origin-Verify': 'edge-secret',
    })
  })

  it('sends nothing it was not given', () => {
    expect(clientIdentityHeaders(createRequestEvent())).toEqual({})
  })
})
