/**
 * The browser and operating system a User-Agent names — for display
 * (the account's session list), never for behaviour: what a page
 * RENDERS differently by device goes through `deviceClassFromUserAgent`.
 *
 * Every browser's UA borrows its neighbours' tokens: Edge, Opera and
 * Samsung Internet carry `Chrome/` and `Safari/`, Chrome carries
 * `Safari/`, an iPhone says "like Mac OS X" and Android says "Linux". So
 * the rules run most specific first, and the first match wins.
 * `undefined` for a UA none of them names; the caller words "unknown"
 * in the reader's language.
 */
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\b(?:OPR|OPiOS|Opera)\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS)\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
]

const OPERATING_SYSTEMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\biPad\b/, 'iPadOS'],
  [/\b(?:iPhone|iPod)\b/, 'iOS'],
  [/\bAndroid\b/, 'Android'],
  [/\bWindows\b/, 'Windows'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\b(?:Macintosh|Mac OS X)\b/, 'macOS'],
  [/\bLinux\b/, 'Linux'],
]

const firstMatch = (rules: ReadonlyArray<readonly [RegExp, string]>, ua: string) =>
  rules.find(([pattern]) => pattern.test(ua))?.[1]

export function browserOf(ua: string): string | undefined {
  return firstMatch(BROWSERS, ua)
}

export function operatingSystemOf(ua: string): string | undefined {
  return firstMatch(OPERATING_SYSTEMS, ua)
}
