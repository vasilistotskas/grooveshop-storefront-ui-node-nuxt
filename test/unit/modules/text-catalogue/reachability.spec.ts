import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { reachableFiles } from '~~/modules/text-catalogue/reachability'
import type { ReachabilitySource } from '~~/modules/text-catalogue/reachability'
import { TEXT_FIXTURE_SOURCE } from '~~/test/fixtures/texts/source'
import { REAL_TEXT_SOURCE } from '~~/test/helpers/realTextSource'
import { APP, REPO, appLabel, autoImportName, readSource, vueFiles, withoutComments } from '~~/test/helpers/sourceText'

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? tsFiles(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : [])
}

const posix = (appDir: string, file: string) => relative(appDir, file).split(sep).join('/')
const rendered = (source: ReachabilitySource, view: string) => {
  const files = reachableFiles(source).get(view)
  if (!files) throw new Error(`no view "${view}"`)
  return [...files].map(file => posix(source.appDir, file)).sort()
}

describe('what a store renders, over the fixture tree', () => {
  const view = (name: string) => rendered(TEXT_FIXTURE_SOURCE, name)

  it('has a view for the default store and one per schema a registry names', () => {
    expect([...reachableFiles(TEXT_FIXTURE_SOURCE).keys()]).toEqual(['default', 'delta_sigma', 'webside'])
  })

  it('gives the default store the shared tree and no variant', () => {
    expect(view('default')).toEqual([
      'components/Chrome/Footer.vue',
      'components/Cookie/Modal.vue',
      'components/Demo/Greeting.vue',
      'components/PageSection/Hero.vue',
      'components/Product/PriorPrice.vue',
      'components/Storefront/Home.vue',
    ])
  })

  it('swaps in the frozen tree for webside and keeps the shared components its tree uses', () => {
    const webside = view('webside')

    expect(webside).toContain('components/variants/webside/Chrome/Footer.vue')
    expect(webside).toContain('components/variants/webside/Product/PriorPrice.vue')
    expect(webside).not.toContain('components/Chrome/Footer.vue')
    expect(webside).not.toContain('components/Product/PriorPrice.vue')
    // Shared by both trees, reached through the frozen footer and home page.
    expect(webside).toContain('components/Cookie/Modal.vue')
    expect(webside).toContain('components/Demo/Greeting.vue')
  })

  it('reaches a page-builder section variant from its own schema only', () => {
    const variant = 'components/PageSection/variants/delta_sigma/Hero.vue'

    expect(view('delta_sigma')).toContain(variant)
    expect(view('delta_sigma')).not.toContain('components/PageSection/Hero.vue')
    expect(view('default')).not.toContain(variant)
    expect(view('webside')).not.toContain(variant)
    // webside has no hero variant of its own: the registry falls back to the base section.
    expect(view('webside')).toContain('components/PageSection/Hero.vue')
  })
})

describe('what a store renders, over the real tree', () => {
  const views = reachableFiles(REAL_TEXT_SOURCE)
  const reaches = (view: string, file: string) => views.get(view)!.has(resolve(APP, file))

  it('names the default store and every schema the registries give a design', () => {
    expect([...views.keys()]).toEqual(['default', 'delta_sigma', 'ekfyseosfyteias', 'webside'])
  })

  it('reaches webside\'s frozen footer and not the default one', () => {
    expect(reaches('webside', 'components/variants/webside/Chrome/Footer.vue')).toBe(true)
    expect(reaches('webside', 'components/Chrome/Footer.vue')).toBe(false)
  })

  it('reaches the default footer for any other store, and no variant tree', () => {
    const variantFiles = [...views.get('default')!].filter(file => /(?:^|\/)variants\//.test(posix(join(APP, 'components'), file)))

    expect(reaches('default', 'components/Chrome/Footer.vue')).toBe(true)
    expect(variantFiles).toEqual([])
  })

  it('still reaches the shared components the frozen tree uses', () => {
    // The frozen tree registers the shared consent banner and assistant as its chrome.
    expect(reaches('webside', 'components/Cookie/Control.vue')).toBe(true)
    expect(reaches('webside', 'components/Chat/Widget.vue')).toBe(true)
    expect(reaches('webside', 'components/Anchor.vue')).toBe(true)
    // ...and not the redesign's own consent banner.
    expect(reaches('webside', 'components/Chrome/CookieConsent.vue')).toBe(false)
    expect(reaches('default', 'components/Cookie/Control.vue')).toBe(false)
  })

  it('reaches a chrome or section variant from its schema only', () => {
    expect(reaches('delta_sigma', 'components/Chrome/variants/delta_sigma/Footer.vue')).toBe(true)
    expect(reaches('delta_sigma', 'components/Chrome/Footer.vue')).toBe(false)
    expect(reaches('delta_sigma', 'components/PageSection/variants/delta_sigma/Hero.vue')).toBe(true)
    expect(reaches('default', 'components/Chrome/variants/delta_sigma/Footer.vue')).toBe(false)
    expect(reaches('webside', 'components/PageSection/variants/delta_sigma/Hero.vue')).toBe(false)
    expect(reaches('ekfyseosfyteias', 'components/PageSection/variants/delta_sigma/Hero.vue')).toBe(false)
    // A section type with a webside variant only (no base entry) is not the default store's.
    expect(reaches('webside', 'components/variants/webside/PageSection/AboutContent.vue')).toBe(true)
    expect(reaches('default', 'components/variants/webside/PageSection/AboutContent.vue')).toBe(false)
  })

  it('leaves the redesign-only page and the design layout out of a frozen store', () => {
    expect(reaches('default', 'components/Storefront/Account/Security.vue')).toBe(true)
    expect(reaches('webside', 'components/Storefront/Account/Security.vue')).toBe(false)
    expect(reaches('default', 'layouts/auth-split.vue')).toBe(true)
    expect(reaches('webside', 'layouts/auth-split.vue')).toBe(false)
  })

  it('uses the same component directories as nuxt.config.ts', () => {
    const config = readFileSync(join(REPO, 'nuxt.config.ts'), 'utf8')

    expect(config).toMatch(/components: \[\s*\{ path: '~\/components\/variants\/webside', prefix: 'Webside' \},\s*'~\/components',\s*\],/)
  })
})

describe('what the walk cannot place', () => {
  const roots: string[] = []
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  })

  /** The fixture tree, copied, with `files` (path under `app/` → text) written over it. */
  function appWith(files: Record<string, string>): ReachabilitySource {
    const root = mkdtempSync(join(tmpdir(), 'text-reach-'))
    roots.push(root)
    const appDir = join(root, 'app')
    cpSync(TEXT_FIXTURE_SOURCE.appDir, appDir, { recursive: true })
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(appDir, file)), { recursive: true })
      writeFileSync(join(appDir, file), text)
    }
    return {
      appDir,
      componentDirs: [
        { path: join(appDir, 'components/variants/webside'), prefix: 'Webside' },
        { path: join(appDir, 'components'), prefix: '' },
      ],
    }
  }

  const fixtureFile = (file: string) => readFileSync(join(TEXT_FIXTURE_SOURCE.appDir, file), 'utf8')

  it('walks the copy like the original', () => {
    expect(rendered(appWith({}), 'default')).toEqual(rendered(TEXT_FIXTURE_SOURCE, 'default'))
  })

  it('fails on a tag that is neither a project component nor a known third-party one', () => {
    const source = appWith({ 'components/Chrome/Footer.vue': '<template><footer><Mystery /></footer></template>' })

    expect(() => reachableFiles(source)).toThrow('components/Chrome/Footer.vue: <Mystery>')
  })

  it('fails on a resolveComponent of a computed name', () => {
    const source = appWith({
      'components/Chrome/Footer.vue': '<script setup lang="ts">\nconst name = \'Cookie\'\nconst c = resolveComponent(`${name}Modal`)\n</script>\n<template><footer /></template>',
    })

    expect(() => reachableFiles(source)).toThrow('resolveComponent() of a computed name')
  })

  it('fails on a registry entry that is not one lazy import', () => {
    const source = appWith({
      'utils/componentRegistry.ts': 'export const componentRegistry = { \'hero_banner\': load() }',
    })

    expect(() => reachableFiles(source)).toThrow('must be exactly one lazy import')
  })

  it('fails on an import() in a registry file that no registry reads', () => {
    const registry = fixtureFile('utils/variantRegistry.ts')
    const source = appWith({
      'utils/variantRegistry.ts': `${registry}\nexport const extra = () => import('~/components/Storefront/Home.vue')\n`,
    })

    expect(() => reachableFiles(source)).toThrow('an import() outside the registries')
  })

  it('fails on a variant tree that no registry names', () => {
    const source = appWith({ 'components/variants/orphaned/Page.vue': '<template><p /></template>' })

    expect(() => reachableFiles(source)).toThrow('variant tree of "orphaned", which no registry names')
  })

  it('fails on a variant that overrides a page the registry has no default for', () => {
    const source = appWith({
      'utils/variantRegistry.ts': fixtureFile('utils/variantRegistry.ts').replace('\'page:home@webside\'', '\'page:nowhere@webside\''),
    })

    expect(() => reachableFiles(source)).toThrow('overrides a page with no default')
  })

  it('does not let a local camelCase variable shadow the PascalCase component of the same name', () => {
    const source = appWith({
      'components/Chrome/Footer.vue': '<script setup lang="ts">\nconst chromeExtra = 1\n</script>\n<template><footer>{{ chromeExtra }}<ChromeExtra /></footer></template>',
      'components/Chrome/Extra.vue': '<template><p /></template>',
    })

    expect(rendered(source, 'default')).toContain('components/Chrome/Extra.vue')
  })

  it('places a tag that names a script-setup binding', () => {
    const source = appWith({
      'components/Chrome/Footer.vue': '<script setup lang="ts">\nimport Local from \'./Local.vue\'\n</script>\n<template><footer><Local /></footer></template>',
      'components/Chrome/Local.vue': '<template><p /></template>',
    })

    expect(rendered(source, 'default')).toContain('components/Chrome/Local.vue')
  })
})

describe('the components no store renders', () => {
  const views = reachableFiles(REAL_TEXT_SOURCE)
  const reached = new Set([...views.values()].flatMap(files => [...files]))
  const all = vueFiles(APP)
  const unreached = all.filter(file => !reached.has(file))

  /** Every `.vue` and `.ts` source under `app/`, read as plain text. */
  const corpus = [...all, ...tsFiles(APP)].map(file => ({ file, text: withoutComments(readSource(file)) }))

  const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

  /**
   * Independent of the walk: a plain text search for every way a component
   * is named in the source. A walk that silently loses an edge (it once let
   * a local `productImages` shadow `<ProductImages>`) would hide a store's
   * texts; this fails instead.
   */
  function referencesTo(file: string): string[] {
    const name = autoImportName(file)
    const path = appLabel(file).replace(/^components\//, '')
    const patterns = [
      new RegExp(String.raw`<(?:Lazy)?${name}(?![\w-])`),
      new RegExp(String.raw`<(?:lazy-)?${kebab(name)}(?![\w-])`),
      new RegExp(String.raw`resolveComponent\(\s*['"\x60](?:Lazy)?${name}['"\x60]`),
      new RegExp(`${path.replaceAll('.', '[.]')}['"\`]`),
    ]
    return corpus
      .filter(source => source.file !== file && patterns.some(pattern => pattern.test(source.text)))
      .map(source => appLabel(source.file))
  }

  it('has a handful of them, so this check still looks at something', () => {
    expect(unreached.length).toBeGreaterThan(0)
  })

  it('are referenced by nothing in app/', () => {
    expect(Object.fromEntries(unreached.map(file => [appLabel(file), referencesTo(file)]).filter(([, found]) => found!.length > 0))).toEqual({})
  })

  it('does catch a component that is referenced: the search finds the product gallery by its tag', () => {
    expect(referencesTo(resolve(APP, 'components/Product/Images.vue'))).toContain('components/Storefront/ProductDetail.vue')
  })
})

describe('what every default store certainly renders', () => {
  const views = reachableFiles(REAL_TEXT_SOURCE)

  // Named by hand from the source, not by the walk: each is rendered by the
  // default page or chrome that the default registry entry mounts.
  it.each([
    ['the product page', 'components/Storefront/ProductDetail.vue'],
    ['the product gallery', 'components/Product/Images.vue'],
    ['the product gallery\'s zoom', 'components/Product/ImageModal.vue'],
    ['the cart page', 'components/Storefront/Cart.vue'],
    ['the cart drawer', 'components/Cart/Drawer.vue'],
    ['the checkout page', 'components/Storefront/Checkout.vue'],
    ['the footer', 'components/Chrome/Footer.vue'],
    ['the navbar', 'components/Chrome/Navbar.vue'],
    ['the paginator', 'components/Pagination/index.vue'],
  ])('%s', (_label, file) => {
    expect(views.get('default')!.has(resolve(APP, file))).toBe(true)
  })
})
