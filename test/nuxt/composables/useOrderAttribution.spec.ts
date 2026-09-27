import { describe, it, expect, beforeEach } from 'vitest'

const STORAGE_KEY = 'order-attribution'
const OWN = 'https://shop.example'

function visit(overrides: Partial<Parameters<ReturnType<typeof useOrderAttribution>['capture']>[0]> = {}) {
  useOrderAttribution().capture({
    query: {},
    referrer: '',
    landingPath: '/',
    ownOrigin: OWN,
    ...overrides,
  })
}

describe('useOrderAttribution', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('keeps the UTM values, the landing path and an external referrer origin', () => {
    visit({
      query: { utm_source: ' ig ', utm_medium: 'social', utm_campaign: 'autumn', page: '2' },
      referrer: 'https://l.instagram.com/some/path?u=secret#frag',
      landingPath: '/products/42',
    })

    expect(useOrderAttribution().read()).toEqual({
      utmSource: 'ig',
      utmMedium: 'social',
      utmCampaign: 'autumn',
      referrer: 'https://l.instagram.com',
      landingPath: '/products/42',
    })
  })

  it('records only the names of allow-listed click ids, never their values', () => {
    visit({ query: { gclid: 'abc123', fbclid: 'zzz', unknown_clid: 'x', ttclid: '' } })

    const stored = window.sessionStorage.getItem(STORAGE_KEY)!
    expect(stored).not.toContain('abc123')
    expect(useOrderAttribution().read()).toEqual({
      clickIds: ['gclid', 'fbclid'],
      landingPath: '/',
    })
  })

  it('caps UTM values at 100 / 100 / 200 characters', () => {
    visit({ query: { utm_source: 's'.repeat(150), utm_medium: 'm'.repeat(150), utm_campaign: 'c'.repeat(250) } })

    const payload = useOrderAttribution().read()!
    expect(payload.utmSource).toHaveLength(100)
    expect(payload.utmMedium).toHaveLength(100)
    expect(payload.utmCampaign).toHaveLength(200)
  })

  it('takes the first value of a repeated param', () => {
    visit({ query: { utm_source: ['first', 'second'] } })

    expect(useOrderAttribution().read()?.utmSource).toBe('first')
  })

  it('drops a same-origin or unparsable referrer', () => {
    visit({ query: { utm_source: 'news' }, referrer: `${OWN}/cart` })
    expect(useOrderAttribution().read()?.referrer).toBeUndefined()

    window.sessionStorage.clear()
    visit({ referrer: 'not a url' })
    expect(useOrderAttribution().read()).toEqual({ landingPath: '/' })

    window.sessionStorage.clear()
    visit({ referrer: `${OWN}/checkout` })
    expect(useOrderAttribution().read()).toEqual({ landingPath: '/' })
  })

  it('opens the session on a direct landing, so a payment return cannot claim it', () => {
    visit({ landingPath: '/products/42' })
    expect(useOrderAttribution().read()).toEqual({ landingPath: '/products/42' })

    // Viva's hosted page redirects back: a full load with an external
    // referrer, but not a new landing.
    visit({ referrer: 'https://www.vivapayments.com/web/checkout', landingPath: '/checkout/success' })
    expect(useOrderAttribution().read()).toEqual({ landingPath: '/products/42' })
  })

  it('lets a later campaign visit replace the stored entry', () => {
    visit({ query: { utm_source: 'ig' }, referrer: 'https://instagram.com/' })
    visit({ query: { gclid: 'g' }, landingPath: '/offers' })

    expect(useOrderAttribution().read()).toEqual({ clickIds: ['gclid'], landingPath: '/offers' })
  })

  it('keeps the first landing referral through a later one', () => {
    visit({ referrer: 'https://www.google.com/', landingPath: '/a' })
    expect(useOrderAttribution().read()).toEqual({ referrer: 'https://www.google.com', landingPath: '/a' })

    // A second referral — or a payment provider's hosted-page return —
    // does not overwrite what is already there.
    visit({ referrer: 'https://www.vivapayments.com/web/checkout', landingPath: '/checkout/success' })
    expect(useOrderAttribution().read()).toEqual({ referrer: 'https://www.google.com', landingPath: '/a' })
  })

  it('keeps a campaign entry through a later referral and a direct visit', () => {
    visit({ query: { utm_source: 'ig' } })
    visit({ referrer: 'https://www.vivapayments.com/' })
    visit()

    expect(useOrderAttribution().read()).toEqual({ utmSource: 'ig', landingPath: '/' })
  })

  it('treats corrupt or foreign storage as empty', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{not json')
    expect(useOrderAttribution().read()).toBeNull()

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ utmSource: 5, clickIds: ['evil'] }))
    expect(useOrderAttribution().read()).toBeNull()

    // An empty slot again, so a referral may fill it.
    visit({ referrer: 'https://duckduckgo.com/' })
    expect(useOrderAttribution().read()?.referrer).toBe('https://duckduckgo.com')
  })

  it('degrades to nothing when storage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access is denied', 'SecurityError')
      },
    })
    try {
      expect(() => visit({ query: { utm_source: 'ig' } })).not.toThrow()
      expect(useOrderAttribution().read()).toBeNull()
    }
    finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original)
      else Reflect.deleteProperty(window, 'sessionStorage')
    }
  })
})
