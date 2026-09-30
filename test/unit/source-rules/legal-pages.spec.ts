import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import YAML from 'yaml'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import { LEGAL_ROUTE_SLUGS } from '~~/shared/utils/legalPages'
import {
  APP,
  REPO,
  callsIn,
  parseScript,
  parseSfc,
  readSource,
  sfcTemplate,
  staticText,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * The legal routes render the tenant's own ContentPage and nothing else.
 *
 * They used to ship the platform's Greek legal text as markup and fall
 * back to it whenever the tenant had published nothing — platform text
 * published under the merchant's name, on a binding document. The text
 * now lives in `page_config/legal_documents.py` on the API and is seeded
 * into every tenant at provisioning.
 *
 * What is left to check here is the wiring nothing renders on its own:
 * every route in `LEGAL_ROUTE_SLUGS` has a page shell handing ITS route
 * to the one legal body, the body carries copy for every route in every
 * locale, and the static sitemap config never drops a legal route. The
 * body's behaviour is `test/nuxt/components/Storefront/Legal.spec.ts`,
 * the `/info/<slug>` redirect `test/nuxt/components/Storefront/Info.spec.ts`,
 * and the sitemap source and gate their `test/unit/server/**` specs.
 */
const ROUTES = Object.keys(LEGAL_ROUTE_SLUGS)

describe('legal routes hand their route to the one legal body', () => {
  // EVERY route in the map, not just the three that shipped boilerplate.
  // `return-policy` was in the map while its page rendered an empty
  // <div />, which stayed harmless only until /info/<slug> began
  // redirecting to its canonical route — at which point the merchant's
  // published returns policy became unreachable in production.
  it.each(ROUTES)('app/pages/%s.vue resolves the legal body with its own route', (route) => {
    const page = resolve(APP, `pages/${route}.vue`)

    const bodies = callsIn(page, /^resolvePage$/).map(({ call }) => staticText(call.arguments[0]))
    expect(bodies).toEqual(['legal'])

    const routesHandedOver: string[] = []
    walkElements(sfcTemplate(page), (node) => {
      for (const prop of node.props) {
        if (prop.type === 6 && prop.name === 'route' && prop.value) routesHandedOver.push(prop.value.content)
      }
    })
    expect(routesHandedOver).toEqual([route])
  })
})

describe('the legal body', () => {
  it.each(SUPPORTED_LOCALES)('carries a description and a breadcrumb for every route in %s', (locale) => {
    // The body picks both by route key, so a route missing from its
    // i18n block renders a raw key.
    const block = parseSfc(resolve(APP, 'components/Storefront/Legal.vue')).customBlocks.find(b => b.type === 'i18n')
    const messages = YAML.parse(block!.content)[locale]

    const missing = ROUTES.filter(route =>
      !messages?.legal?.[route]?.description || !messages?.breadcrumb?.items?.[route]?.label,
    )
    expect(missing).toEqual([])
  })
})

describe('the static sitemap config', () => {
  /** The string entries of `sitemap.exclude` in nuxt.config.ts. */
  function sitemapExclude(): string[] {
    let exclude: AstNode | undefined
    walkAst(parseScript(readSource(resolve(REPO, 'nuxt.config.ts'))), (node) => {
      if (node.type !== 'ObjectProperty' || node.key.name !== 'sitemap' || node.value.type !== 'ObjectExpression') return
      exclude = node.value.properties.find((p: AstNode) => p.key?.name === 'exclude')?.value
    })
    return (exclude?.elements ?? []).map(staticText).filter(Boolean)
  }

  it('never excludes a legal route', () => {
    // `sitemap.exclude` is applied to the FINAL url set, sources
    // included — `resolveSitemapEntries` filters every source's urls,
    // not just the auto-discovered routes. Excluding a legal route
    // there drops it for EVERY tenant, including the ones that have the
    // document, and no per-tenant source can add it back.
    const exclude = sitemapExclude()

    // Proves the lookup still finds the list this test is about.
    expect(exclude).toContain('/cart')

    // Entries are globs (`/account/**`), so a legal route is caught
    // however it is spelled — directly, under a pattern, or with the
    // `/en` prefix the second locale's copy carries.
    const glob = (pattern: string) => new RegExp(`^${pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .split('**')
      .map(part => part.replace(/\*/g, '[^/]*'))
      .join('.*')}$`)
    const dropped = ROUTES.flatMap(route => [`/${route}`, `/en/${route}`])
      .filter(path => exclude.some(pattern => glob(pattern).test(path)))
    expect(dropped).toEqual([])
  })
})
