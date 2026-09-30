import { resolve } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import {
  COMPONENTS,
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
 * The frozen `webside` tree must stay self-contained.
 *
 * `app/components/variants/webside/**` is today's platform storefront,
 * kept byte-for-byte so webside.gr keeps rendering what it renders now
 * while the default components under `app/components/` are rewritten.
 * It is registered with the auto-import prefix `Webside`, so a frozen
 * component that renders `<ProductCard>` instead of `<WebsideProductCard>`
 * would silently pick up the NEW default card — and webside's page would
 * change without any test naming the file that changed it.
 *
 * So inside the frozen tree, a tag or `resolveComponent()` name that has
 * a frozen twin must use the `Webside` prefix. Read off the parsed
 * template and script, so a comment or a string cannot trip it.
 *
 * Its sibling rule — no page macro (`definePageMeta`, `defineRouteRules`)
 * under `app/components/`, where Nuxt never extracts them — is an ESLint
 * `no-restricted-syntax` selector in `eslint.config.mjs`.
 */
const FROZEN = resolve(COMPONENTS, 'variants/webside')
const PREFIX = 'Webside'

let frozenFiles: string[]
let frozenNames: Set<string>
let prefixedReferences = 0
let offenders: string[]

beforeAll(() => {
  frozenFiles = vueFiles(FROZEN)
  frozenNames = new Set(frozenFiles.map(file => componentName(relativeLabel(FROZEN, file))))
  offenders = []

  const check = (label: string, name: string, how: string) => {
    if (name.startsWith(PREFIX)) prefixedReferences++
    else if (frozenNames.has(name)) offenders.push(`${label}: ${how}`)
  }

  for (const file of frozenFiles) {
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

describe('the frozen webside tree', () => {
  it('exists and is registered with the Webside prefix', () => {
    expect(frozenFiles.length).toBeGreaterThan(100)
    const config = readSource(resolve(REPO, 'nuxt.config.ts'))
    expect(config).toMatch(/path: '~\/components\/variants\/webside',\s*prefix: 'Webside'/)
  })

  it('references frozen components only through the Webside prefix', () => {
    expect(offenders, 'these resolve to the NEW default component').toEqual([])
  })

  it('still sees the prefixed references it guards', () => {
    // A naming or parsing change that recognised no component at all
    // would pass the rule above forever.
    expect(prefixedReferences).toBeGreaterThan(100)
  })
})
