import { describe, expect, it } from 'vitest'
import type { INPLongestScriptSummary, INPMetricWithAttribution } from 'web-vitals/attribution'
import { buildInpReport, INP_REPORTED_RATINGS, routeAt, scriptSource } from '~/utils/inpReport'

const ORIGIN = 'https://webside.gr'

function metric(overrides: {
  value?: number
  rating?: INPMetricWithAttribution['rating']
  attribution?: Partial<INPMetricWithAttribution['attribution']>
} = {}): INPMetricWithAttribution {
  return {
    name: 'INP',
    value: overrides.value ?? 412.6,
    rating: overrides.rating ?? 'poor',
    delta: 412.6,
    id: 'v6-1',
    entries: [],
    navigationType: 'navigate',
    navigationId: 1,
    attribution: {
      interactionTarget: 'div.justify-between>button.rounded-md',
      interactionTime: 7183.2,
      interactionType: 'pointer',
      nextPaintTime: 7600,
      processedEventEntries: [],
      inputDelay: 10.4,
      processingDuration: 516.6,
      presentationDelay: 81.2,
      loadState: 'complete',
      longAnimationFrameEntries: [],
      ...overrides.attribution,
    },
  }
}

function longestScript(entry: { sourceURL: string, invoker: string }): INPLongestScriptSummary {
  return {
    entry: {
      ...entry,
      name: 'script',
      entryType: 'script',
      startTime: 7190,
      duration: 360.4,
      executionStart: 7191,
      invokerType: 'event-listener',
      sourceFunctionName: 'onClick',
      sourceCharPosition: 835,
      pauseDuration: 0,
      forcedStyleAndLayoutDuration: 148.3,
      windowAttribution: 'self',
      toJSON: () => ({}),
    },
    subpart: 'processing-duration',
    intersectingDuration: 360.4,
  }
}

describe('INP_REPORTED_RATINGS', () => {
  it('reports a page whose INP is not good, and only such a page', () => {
    expect([...INP_REPORTED_RATINGS].sort()).toEqual(['needs-improvement', 'poor'])
  })
})

describe('routeAt', () => {
  const spans = [
    { since: 0, name: 'index___el' },
    { since: 3000, name: 'products-id-slug___el' },
    { since: 8000, name: 'cart___el' },
  ]

  it('names the route the page was on when the interaction happened, not the last one', () => {
    expect(routeAt(spans, 5000)).toBe('products-id-slug___el')
    expect(routeAt(spans, 1200)).toBe('index___el')
    expect(routeAt(spans, 8000)).toBe('cart___el')
  })

  it('names the current route when the interaction has no time', () => {
    expect(routeAt(spans, undefined)).toBe('cart___el')
  })
})

describe('scriptSource', () => {
  it('names a chunk of ours by its path', () => {
    expect(scriptSource(`${ORIGIN}/_nuxt/CeFNOCv3-e0bece00.js`, ORIGIN)).toBe('/_nuxt/CeFNOCv3-e0bece00.js')
  })

  it('names another origin\'s script by origin and path, without its query', () => {
    expect(scriptSource('https://www.googletagmanager.com/gtag/js?id=G-GGKMZ8YLNN', ORIGIN))
      .toBe('https://www.googletagmanager.com/gtag/js')
  })

  it('names the page\'s own inline code `document`: its URL can carry a reset key', () => {
    expect(scriptSource(`${ORIGIN}/account/password/reset/key/3k-a1b2c3`, ORIGIN)).toBe('document')
  })

  it('gives nothing for a URL that is not http(s) or not a URL', () => {
    expect(scriptSource('chrome-extension://abc/content.js', ORIGIN)).toBe('')
    expect(scriptSource('', ORIGIN)).toBe('')
    expect(scriptSource('not a url', ORIGIN)).toBe('')
  })
})

describe('buildInpReport', () => {
  it('reports the value, the target, the route and the three phases in whole milliseconds', () => {
    expect(buildInpReport(metric(), 'products-id-slug___el', ORIGIN)).toEqual({
      value: 413,
      rating: 'poor',
      route: 'products-id-slug___el',
      interactionType: 'pointer',
      target: 'div.justify-between>button.rounded-md',
      loadState: 'complete',
      inputDelay: 10,
      processingDuration: 517,
      presentationDelay: 81,
      longAnimationFrames: 0,
    })
  })

  it('names the longest script, its phase and the reflow it forced', () => {
    const report = buildInpReport(metric({
      attribution: {
        longestScript: longestScript({ sourceURL: `${ORIGIN}/_nuxt/CeFNOCv3-e0bece00.js`, invoker: 'BUTTON.onclick' }),
        totalScriptDuration: 420.2,
        totalStyleAndLayoutDuration: 160.7,
        totalPaintDuration: 12.1,
        totalUnattributedDuration: 4.4,
      },
    }), 'index___el', ORIGIN)

    expect(report.longestScript).toEqual({
      source: '/_nuxt/CeFNOCv3-e0bece00.js',
      invoker: 'BUTTON.onclick',
      invokerType: 'event-listener',
      functionName: 'onClick',
      subpart: 'processing-duration',
      duration: 360,
      forcedStyleAndLayout: 148,
    })
    expect(report).toMatchObject({ totalScriptDuration: 420, totalStyleAndLayoutDuration: 161, totalPaintDuration: 12, totalUnattributedDuration: 4 })
  })

  it('drops the query of a classic script named as its own invoker', () => {
    const report = buildInpReport(metric({
      attribution: {
        longestScript: longestScript({
          sourceURL: 'https://www.googletagmanager.com/gtag/js?id=G-GGKMZ8YLNN',
          invoker: 'https://www.googletagmanager.com/gtag/js?id=G-GGKMZ8YLNN',
        }),
      },
    }), undefined, ORIGIN)

    expect(report.longestScript?.invoker).toBe('https://www.googletagmanager.com/gtag/js')
    expect(JSON.stringify(report)).not.toContain('G-GGKMZ8YLNN')
  })
})
