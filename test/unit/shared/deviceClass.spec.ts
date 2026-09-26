/**
 * The storefront must classify every User-Agent exactly as Cloudflare
 * does when it caches by device type, or the edge files one class's
 * render under another's key. Cases are real User-Agents; the rules are
 * Cloudflare's published ones
 * (developers.cloudflare.com/automatic-platform-optimization/reference/cache-device-type/).
 */
import { describe, expect, it } from 'vitest'
import { deviceClassFromUserAgent } from '../../../shared/utils/deviceClass'

const CASES: Array<[string, 'mobile' | 'tablet' | 'desktop', string]> = [
  ['iPhone Safari', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
  ['iPod', 'mobile', 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'],
  ['Android phone Chrome', 'mobile', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'],
  ['Android phone Firefox', 'mobile', 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0'],
  ['Googlebot smartphone', 'mobile', 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['KaiOS', 'mobile', 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5'],
  ['Windows Phone', 'mobile', 'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0 Mobile Safari/537.36 Edge/15.14977'],
  // An iPad says "Mobile/15E148"; Cloudflare still calls it a tablet.
  ['iPad Safari', 'tablet', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
  ['Android tablet Chrome', 'tablet', 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'],
  ['Windows Chrome', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'],
  ['macOS Safari', 'desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'],
  ['Linux Firefox', 'desktop', 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'],
  ['Googlebot desktop', 'desktop', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['no User-Agent', 'desktop', ''],
]

describe('deviceClassFromUserAgent (Cloudflare\'s rules)', () => {
  it.each(CASES)('%s → %s', (_label, expected, ua) => {
    expect(deviceClassFromUserAgent(ua)).toBe(expected)
  })

  it('is case-insensitive, as Cloudflare\'s match is', () => {
    expect(deviceClassFromUserAgent('MOZILLA/5.0 (IPAD; CPU OS 18_0)')).toBe('tablet')
  })
})
