import { describe, expect, it } from 'vitest'
import { browserOf, operatingSystemOf } from '~~/shared/utils/userAgent'

/**
 * The browser and system a session's User-Agent names, for the
 * account's session list. Every browser's UA borrows its neighbours'
 * tokens — Edge and Opera carry `Chrome/` and `Safari/`, an iPhone
 * carries "like Mac OS X", Android carries "Linux" — so the most
 * specific token must win. Real strings, one per case.
 */
const UA = {
  chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  operaMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  chromeIpad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1',
  firefoxIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15',
  samsungAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  chromeChromebook: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  curl: 'curl/8.9.1',
}

describe('browserOf', () => {
  it.each([
    [UA.chromeWindows, 'Chrome'],
    [UA.edgeWindows, 'Edge'],
    [UA.operaMac, 'Opera'],
    [UA.firefoxLinux, 'Firefox'],
    [UA.safariIphone, 'Safari'],
    [UA.chromeIpad, 'Chrome'],
    [UA.firefoxIphone, 'Firefox'],
    [UA.samsungAndroid, 'Samsung Internet'],
    [UA.chromeAndroid, 'Chrome'],
    [UA.safariMac, 'Safari'],
  ])('names %s as %s', (ua, expected) => {
    expect(browserOf(ua)).toBe(expected)
  })

  it('names nothing it does not recognise', () => {
    expect(browserOf(UA.curl)).toBeUndefined()
    expect(browserOf('')).toBeUndefined()
  })
})

describe('operatingSystemOf', () => {
  it.each([
    [UA.chromeWindows, 'Windows'],
    [UA.operaMac, 'macOS'],
    [UA.firefoxLinux, 'Linux'],
    [UA.safariIphone, 'iOS'],
    [UA.chromeIpad, 'iPadOS'],
    [UA.samsungAndroid, 'Android'],
    [UA.chromeChromebook, 'ChromeOS'],
  ])('names %s as %s', (ua, expected) => {
    expect(operatingSystemOf(ua)).toBe(expected)
  })

  it('names nothing it does not recognise', () => {
    expect(operatingSystemOf(UA.curl)).toBeUndefined()
  })
})
