import { describe, it, expect, beforeAll } from 'vitest'
import { COMPONENTS, FROZEN, appLabel, callsIn, propertyOf, staticText, vueFiles, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * Every caller of the offers endpoints must name the reader's language.
 *
 * Django resolves a promotion's name and description SERVER-side rather
 * than shipping a translations map — it is the one storefront payload
 * that works that way — so a request without `languageCode` comes back
 * in the store's default language whatever locale the page is on. The
 * demo store's `/en` carried Greek offer cards over correct English
 * rows sitting unread in the database.
 *
 * There are three callers: the `/offers` page, the product page's
 * panel, and the homepage band. Fixing the first two and missing the
 * third left exactly one Greek band on an otherwise English page, which
 * is why this is a rule and not three edits.
 *
 * The cache key has to carry the locale too, or the first locale
 * fetched is served to the other — the same defect one layer down, and
 * invisible until someone switches language.
 *
 * Read off the script AST: every call is checked, whichever fetcher it
 * uses and however its options are laid out.
 *
 * The frozen `variants/webside` tree is exempt: that store serves one
 * language, and its render is pinned.
 */
const FETCHER = /^(use(Lazy)?Api|useRequestApi|\$api)$/
const KEYED_FETCHER = /^use(Lazy)?Api$/

/** The URL a fetcher is called with: a literal, or a getter returning one. */
function urlOf(argument: AstNode | undefined): string | undefined {
  if (argument?.type === 'ArrowFunctionExpression' && argument.body.type !== 'BlockStatement') return staticText(argument.body)
  return staticText(argument)
}

function mentionsLocale(node: AstNode | undefined): boolean {
  if (!node) return false
  let found = false
  walkAst(node, (child) => {
    if (child.type === 'Identifier' && /locale/i.test(child.name)) found = true
  })
  return found
}

interface Caller { site: string, fetcher: string, languageCode: boolean, keyedByLocale: boolean }

let callers: Caller[]

beforeAll(() => {
  callers = vueFiles(COMPONENTS, { exclude: [FROZEN] }).flatMap(file =>
    callsIn(file, FETCHER).flatMap(({ call, line }) => {
      if (!urlOf(call.arguments[0])?.startsWith('/api/promotions')) return []
      const options = call.arguments[1]
      return [{
        site: `${appLabel(file)}:${line}`,
        fetcher: call.callee.name,
        languageCode: propertyOf(propertyOf(options, 'query'), 'languageCode') !== undefined,
        keyedByLocale: mentionsLocale(propertyOf(options, 'key')),
      }]
    }),
  )
})

describe('a caller of the offers endpoints', () => {
  it('finds the callers at all', () => {
    // Guards the test: a rename would otherwise make it vacuous.
    expect(callers.length).toBeGreaterThanOrEqual(3)
  })

  it('sends languageCode', () => {
    expect(
      callers.filter(c => !c.languageCode).map(c => c.site),
      'these ask Django for offers without saying which language to answer in',
    ).toEqual([])
  })

  it('keys its cache entry by locale', () => {
    expect(
      callers.filter(c => KEYED_FETCHER.test(c.fetcher) && !c.keyedByLocale).map(c => c.site),
      'these would serve whichever locale fetched first to every reader',
    ).toEqual([])
  })
})
