import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { REPO, parseScript, readSource, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * `/` answers in the tenant's own default locale, for everybody.
 *
 * Turning `detectBrowserLanguage` back on breaks two things at once, and
 * neither shows up in a test that does not send `Accept-Language`:
 *
 * 1. **It cannot run on the server here.** `/` is SWR-cached for every
 *    visitor, so a cache hit never reaches the Nuxt app and the redirect
 *    falls to the browser — where it fires DURING hydration, patching an
 *    English tree over Greek-rendered markup. Vue logged "Hydration
 *    completed but contains mismatches" and then died in `insertBefore`;
 *    the visitor got an error page instead of the homepage. Reproduced on
 *    the demo store 2026-09-19, three loads out of three, while `/` and
 *    `/en` each hydrated cleanly on their own.
 * 2. **It cannot see the tenant.** Detection matches `navigator.languages`
 *    against the BUILD-TIME locale list, which is platform-wide, so on a
 *    store that serves one language it resolved a locale the store does
 *    not have and redirected `/` onto a prefix
 *    `locale-available.global.ts` 404s.
 *
 * A visitor changes language with the switcher in the header, and every
 * `/<locale>/**` URL stays directly linkable, bookmarkable and crawlable
 * — which is also what Google asks for instead of an auto-redirect.
 */

/** Every value `detectBrowserLanguage` is given anywhere in the config, parsed. */
function detectionValues(): AstNode[] {
  const values: AstNode[] = []
  walkAst(parseScript(readSource(resolve(REPO, 'nuxt.config.ts'))), (node) => {
    if (node.type === 'ObjectProperty' && !node.computed && node.key.name === 'detectBrowserLanguage') values.push(node.value)
  })
  return values
}

describe('i18n browser-language detection', () => {
  it('is configured exactly once, as the literal false', () => {
    // Read off the AST: prose about the option cannot satisfy it, and an
    // object — any object — switches detection back on
    // (`useI18nDetection` reports `enabled: !!detectBrowserLanguage`).
    expect(detectionValues().map(value => value.type === 'BooleanLiteral' ? value.value : value.type))
      .toEqual([false])
  })
})
