/**
 * Post-deploy verification of the Δelta Σigma pages: the structures
 * the boards ask for, and the band grounds in reading order.
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE ?? 'https://delta-sigma.grooveshop.space'

const probe = () => {
  const bands = [...document.querySelectorAll('main section, main > div > section')]
    .filter((s) => {
      const box = s.getBoundingClientRect()
      const position = getComputedStyle(s).position
      return box.width >= window.innerWidth - 2
        && (position === 'static' || position === 'relative')
    })
  const ground = (el) => {
    const rgb = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)
    if (!rgb) return '?'
    const sum = Number(rgb[0]) + Number(rgb[1]) + Number(rgb[2])
    if (Number(rgb[3] ?? 1) === 0) return 'transparent'
    // The two page surfaces are one step apart; anything else is a card.
    return sum < 40 ? 'ground' : sum < 120 ? 'raised' : `light(${sum})`
  }
  return {
    h1: document.querySelectorAll('h1').length,
    h1text: document.querySelector('h1')?.textContent?.trim().slice(0, 40),
    bands: bands.map(ground),
    tabs: document.querySelectorAll('[role="tab"]').length,
    railVertical: document.querySelector('[role="tablist"]')?.getAttribute('aria-orientation') ?? null,
    radios: document.querySelectorAll('[role="radio"]').length,
    pressed: document.querySelectorAll('[aria-pressed]').length,
    rows: document.querySelectorAll('ol > li').length,
    fileInputs: document.querySelectorAll('input[type=file]').length,
    tels: document.querySelectorAll('a[href^="tel:"]').length,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 0),
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
  extraHTTPHeaders: { 'Accept-Language': 'el-GR,el;q=0.9' },
})
const page = await ctx.newPage()

for (const route of ['/', '/deset', '/eidikefsi', '/drastiriotites', '/empeiria', '/synergates', '/contact']) {
  const res = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 })
  const info = await page.evaluate(probe)
  console.log(`\n${route}  [${res?.status()}]`)
  console.log(`  h1=${info.h1} "${info.h1text}"  bands=${info.bands.join(',')}`)
  console.log(`  tabs=${info.tabs} vertical=${info.railVertical} radios=${info.radios} pressed=${info.pressed} rows=${info.rows} tel=${info.tels} file=${info.fileInputs}`)

  // Drive the selector where there is one.
  if (info.tabs > 1) {
    const tabs = await page.$$('[role="tab"]')
    const before = await page.$eval('[role="tabpanel"]', el => el.innerText.slice(0, 60))
    await tabs[tabs.length - 1].click()
    await page.waitForTimeout(300)
    const after = await page.$eval('[role="tabpanel"]', el => el.innerText.slice(0, 60))
    console.log(`  panel changed: ${before !== after}`)
    console.log(`  first: ${JSON.stringify(before)}`)
    console.log(`  last:  ${JSON.stringify(after)}`)
  }
  // Drive the register's filter.
  if (route === '/empeiria') {
    const chips = await page.$$('[aria-pressed]')
    await chips[2].click()
    await page.waitForTimeout(300)
    const filtered = await page.evaluate(() => ({
      rows: document.querySelectorAll('ol > li').length,
      ordinals: [...document.querySelectorAll('ol > li span.font-mono')]
        .map(s => s.textContent.trim()).filter(t => /^\d\d$/.test(t)).slice(0, 4),
      count: document.querySelector('[aria-live=polite]')?.textContent?.trim(),
    }))
    console.log(`  filtered: ${JSON.stringify(filtered)}`)
  }
}

await ctx.close()
await browser.close()
