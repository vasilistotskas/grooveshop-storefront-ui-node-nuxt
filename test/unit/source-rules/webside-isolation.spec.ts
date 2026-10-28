import { resolve } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import {
  COMPONENTS,
  WEBSIDE_DESIGN,
  REPO,
  appLabel,
  callsIn,
  componentName,
  readSource,
  relativeLabel,
  sfcTemplate,
  staticText,
  vueFiles,
  walkElements,
} from '../../helpers/sourceText'

/**
 * The `webside` design must stay self-contained.
 *
 * `app/components/variants/webside/**` is webside's own design: the
 * templates (markup, layout, styling) that store renders, apart from the
 * default components under `app/components/`.
 * It is registered with the auto-import prefix `Webside`, so a webside
 * component that renders `<ProductCard>` instead of `<WebsideProductCard>`
 * would silently pick up the NEW default card — and webside's page would
 * change without any test naming the file that changed it.
 *
 * So inside the webside design, a tag or `resolveComponent()` name that has
 * a webside twin must use the `Webside` prefix. Read off the parsed
 * template and script, so a comment or a string cannot trip it.
 *
 * Its sibling rule — no page macro (`definePageMeta`, `defineRouteRules`)
 * under `app/components/`, where Nuxt never extracts them — is an ESLint
 * `no-restricted-syntax` selector in `eslint.config.mjs`.
 */
const PREFIX = 'Webside'

let designFiles: string[]
let designNames: Set<string>
let prefixedReferences = 0
let offenders: string[]

beforeAll(() => {
  designFiles = vueFiles(WEBSIDE_DESIGN)
  designNames = new Set(designFiles.map(file => componentName(relativeLabel(WEBSIDE_DESIGN, file))))
  offenders = []

  const check = (label: string, name: string, how: string) => {
    if (name.startsWith(PREFIX)) prefixedReferences++
    else if (designNames.has(name)) offenders.push(`${label}: ${how}`)
  }

  for (const file of designFiles) {
    const label = appLabel(file)
    walkElements(sfcTemplate(file), (node) => {
      check(label, node.tag.replace(/^Lazy/, ''), `<${node.tag}>`)
    })
    for (const { call, line } of callsIn(file, /^resolveComponent$/)) {
      const name = staticText(call.arguments[0])
      if (name) check(`${label}:${line}`, name.replace(/^Lazy/, ''), `resolveComponent('${name}')`)
    }
  }
})

describe('the webside design', () => {
  it('exists and is registered with the Webside prefix', () => {
    expect(designFiles.length).toBeGreaterThan(100)
    const config = readSource(resolve(REPO, 'nuxt.config.ts'))
    expect(config).toMatch(/path: '~\/components\/variants\/webside',\s*prefix: 'Webside'/)
  })

  it('references webside components only through the Webside prefix', () => {
    expect(offenders, 'these resolve to the NEW default component').toEqual([])
  })

  it('still sees the prefixed references it guards', () => {
    // A naming or parsing change that recognised no component at all
    // would pass the rule above forever.
    expect(prefixedReferences).toBeGreaterThan(100)
  })

  // Webside draws the brand, in-stock and on-offer filters (and the rest of
  // the listing's filters) in its own look, from the same data as the
  // default design. The look is what this guards: the default design's
  // filter, sidebar or toolbar markup mounted inside webside's listing
  // would change it without any webside file changing.
  it('draws the listing filters from its own components, not the default design ones', () => {
    const defaultListing = new Set(
      vueFiles(resolve(COMPONENTS, 'Products')).map(file => componentName(relativeLabel(COMPONENTS, file))),
    )
    const drawn: string[] = []
    const mounted: string[] = []

    for (const file of designFiles) {
      walkElements(sfcTemplate(file), (node) => {
        const name = node.tag.replace(/^Lazy/, '')
        if (name.startsWith(PREFIX + 'ProductsFilters')) drawn.push(name)
        if (defaultListing.has(name)) mounted.push(`${appLabel(file)}: <${node.tag}>`)
      })
    }

    expect(mounted).toEqual([])
    expect(drawn, 'the brand and availability filters are webside components').toEqual(
      expect.arrayContaining(['WebsideProductsFiltersBrandFilter', 'WebsideProductsFiltersAvailabilityFilter']),
    )
  })

  it('reads the brand data through the shared composables only', () => {
    const brandReaders = designFiles
      .filter(file => callsIn(file, /^(useProductBrands|useAllBrands)$/).length > 0)
      .map(appLabel)

    expect(brandReaders.length, 'the rule would pass with nothing to guard').toBeGreaterThanOrEqual(2)
  })
})
