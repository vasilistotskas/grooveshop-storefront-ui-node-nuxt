/**
 * Visual audit: every route × colour scheme × viewport.
 *
 * Answers the questions I could not answer by eye — the browser here
 * cannot leave its maximized window and the site sends
 * X-Frame-Options: DENY, so a 390px view was unreachable.
 *
 * Per page it reports:
 *   seam      the chrome's background vs the page's, by luminance.
 *             A dark header on a light page (what light mode did) is a
 *             seam; both on the same side is not.
 *   overflow  documentElement.scrollWidth beyond the viewport, i.e. a
 *             band that does not fit the phone.
 *   errors    console errors and failed requests during load.
 *   chrome    whether the tenant's own navbar/footer rendered at all.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.AUDIT_BASE
  ?? 'https://delta-sigma.grooveshop.space'
const OUT = process.env.AUDIT_OUT ?? 'audit'
const ONLY = process.env.AUDIT_ONLY

const ROUTES = [
  // The pages the design draws, in both locales.
  '/', '/en',
  '/deset', '/en/deset',
  '/eidikefsi', '/en/eidikefsi',
  '/drastiriotites', '/en/drastiriotites',
  '/synergates', '/en/synergates',
  '/empeiria', '/en/empeiria',
  '/contact', '/en/contact',
  // Legal — platform pages, still reachable and still ours to keep
  // rendering.
  '/privacy-policy', '/terms-of-use', '/cookies-policy', '/return-policy',
  // Surfaces the design does NOT have. Listed so the audit says
  // whether they are still reachable, which is the point: each of
  // these must answer 404 once the catalogue setting and the blog
  // plan flag are off.
  '/products', '/products/category/1/deset',
  '/products/2/deset-invt-tm750',
  '/blog', '/blog/categories',
  '/blog/post/48/siragges-asprovaltas',
  '/search', '/offers',
  // Retired: the prose pages the four above replaced.
  '/info/eidikefsi',
]

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]
const SCHEMES = ['light', 'dark']

/** WCAG relative luminance of a `rgb()`/`rgba()` string. */
function luminance(css) {
  const m = String(css).match(/-?[\d.]+/g)
  if (!m || m.length < 3) return null
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const probe = () => {
  const opaque = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg
    }
    return null
  }
  // The element that PAINTS the chrome: the sticky bar itself, found
  // by the lockup it contains rather than by tag — the tenant variant's
  // root is a div, and `querySelector('header')` matched a different
  // element, which is why the first run reported every page as `ok`.
  const lockup = [...document.querySelectorAll('span, div')]
    .find(e => e.textContent?.trim() === 'Consulting · Engineering')
  let header = null
  for (let n = lockup; n; n = n.parentElement) {
    if (getComputedStyle(n).position !== 'sticky') continue
    header = n
    break
  }
  header ??= document.querySelector('header')
  // PAGE bands only. An overlay — the cookie banner is one — is also
  // a tall <section>, and counting it flagged every correct light page
  // as a seam because the banner is light while the chrome is not yet.
  // A band spans the viewport and sits in normal flow; an overlay does
  // not do both.
  const bands = [...document.querySelectorAll('section')]
    .filter((s) => {
      const box = s.getBoundingClientRect()
      const position = getComputedStyle(s).position
      return box.height > 80
        && box.width >= window.innerWidth - 2
        && (position === 'static' || position === 'relative')
    })
  const main = document.querySelector('main') ?? document.body
  return {
    body: getComputedStyle(document.body).backgroundColor,
    header: header ? opaque(header) : null,
    main: opaque(main),
    bands: bands.slice(0, 12).map(s => opaque(s)),
    scrollWidth: document.documentElement.scrollWidth,
    inner: window.innerWidth,
    hasTenantChrome: document.body.textContent.includes('Consulting · Engineering'),
    lang: document.documentElement.lang,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 40) ?? null,
    zeroPrice: /0,00\s*€/.test(document.body.textContent),
  }
}

const rows = []
const browser = await chromium.launch()
for (const scheme of SCHEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: scheme,
      locale: 'el-GR',
      extraHTTPHeaders: { 'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8' },
    })
    mkdirSync(`${OUT}/${scheme}-${vp.name}`, { recursive: true })
    for (const route of ROUTES) {
      if (ONLY && !route.includes(ONLY)) continue
      const page = await ctx.newPage()
      const errors = []
      page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 120)))
      page.on('pageerror', e => errors.push(`pageerror: ${e.message.slice(0, 120)}`))
      // With the REASON: a `keepalive` POST the page fires as it
      // unloads (the cookie-consent beacon) is aborted when this
      // script closes the page, and an ERR_ABORTED on a request the
      // site made correctly is not a finding. Without the reason it
      // read as "cookie-consent fails on every page", and it does
      // not — it answers 204.
      page.on('requestfailed', r => errors.push(
        `net: ${r.url().slice(-46)} ${r.failure()?.errorText ?? '?'}`,
      ))
      let status = 0
      try {
        const res = await page.goto(BASE + route, {
          waitUntil: 'networkidle', timeout: 45000,
        })
        status = res?.status() ?? 0
      }
      catch (e) {
        errors.push(`goto: ${e.message.split('\n')[0].slice(0, 90)}`)
      }
      const info = await page.evaluate(probe).catch(() => null)
      const file = route.replace(/[^a-z0-9]+/gi, '_') || 'root'
      await page.screenshot({
        path: `${OUT}/${scheme}-${vp.name}/${file}.png`, fullPage: false,
      }).catch(() => {})

      let seam = 'n/a'
      if (info?.header && info?.main) {
        const h = luminance(info.header)
        const m = luminance(info.main)
        if (h !== null && m !== null) {
          seam = (h > 0.5) === (m > 0.5) ? 'ok' : `SEAM h=${h.toFixed(2)} m=${m.toFixed(2)}`
        }
      }
      const bandSeam = (info?.bands ?? [])
        .map(luminance)
        .filter(v => v !== null)
        .some(v => info?.header && (v > 0.5) !== (luminance(info.header) > 0.5))
      rows.push({
        scheme, vp: vp.name, route, status,
        finalUrl: page.url().replace(BASE, '') || '/',
        lang: info?.lang ?? '',
        chrome: info?.hasTenantChrome ? 'yes' : 'NO',
        seam: bandSeam && seam === 'ok' ? 'SEAM(band)' : seam,
        overflow: info && info.scrollWidth > info.inner + 1
          ? `${info.scrollWidth}>${info.inner}`
          : 'ok',
        zeroPrice: info?.zeroPrice ? 'YES' : '',
        errors: errors.slice(0, 2).join(' | '),
      })
      await page.close()
    }
    await ctx.close()
  }
}
await browser.close()

const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n)
console.log([
  pad('scheme', 6), pad('vp', 8), pad('route', 34), pad('st', 4),
  pad('final', 26), pad('lang', 6), pad('chr', 4), pad('seam', 22),
  pad('overflow', 12), pad('0€', 4), 'errors',
].join(' '))
for (const r of rows) {
  console.log([
    pad(r.scheme, 6), pad(r.vp, 8), pad(r.route, 34), pad(r.status, 4),
    pad(r.finalUrl, 26), pad(r.lang, 6), pad(r.chrome, 4), pad(r.seam, 22),
    pad(r.overflow, 12), pad(r.zeroPrice, 4), r.errors,
  ].join(' '))
}
const bad = rows.filter(r => r.status !== 200 || r.chrome === 'NO'
  || r.seam.startsWith('SEAM') || r.overflow !== 'ok' || r.errors)
console.log(`\n${rows.length} checks, ${bad.length} with findings`)
