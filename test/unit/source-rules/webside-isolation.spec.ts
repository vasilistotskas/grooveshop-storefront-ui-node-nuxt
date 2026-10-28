import { resolve } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import {
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

  // The brand filter's data costs two requests (the `brand` facet and the
  // brand list), and webside has no brand filter: it must make exactly the
  // requests it made before. `useProductSearchData`, which it does read,
  // never asks for either (its own spec).
  it('never loads the data of the brand filter', () => {
    const readers = designFiles.filter(file => callsIn(file, /^useProductSearchData$/).length > 0)
    const brandReaders = designFiles.filter(file => callsIn(file, /^(useProductBrands|useAllBrands)$/).length > 0)

    expect(readers.length, 'the rule would pass with nothing to guard').toBeGreaterThanOrEqual(4)
    expect(brandReaders.map(appLabel)).toEqual([])
  })
})
