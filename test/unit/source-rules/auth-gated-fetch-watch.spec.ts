import { describe, it, expect, beforeAll } from 'vitest'
import { APP, appLabel, callsIn, propertyOf, staticText, vueFiles } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * An auth-required fetch must not be left to auto-refetch.
 *
 * `useApi`/`useLazyApi` (Nuxt's `useFetch` underneath) watch their
 * reactive options. `immediate` only gates the FIRST call, so a computed
 * `key` or a reactive `body` re-fires the request on every change —
 * including for anonymous visitors, against an endpoint that answers 401.
 *
 * This has now happened twice. 2026-07-04: `Blog/Posts/List.vue` posted
 * to `/api/blog/posts/liked-posts` on every pagination change, 7 calls
 * in 13 seconds per anonymous browsing session. 2026-09-21: the same
 * shape in `Products/List.vue` against
 * `/api/products/favourites/favourites-by-products`, which a language
 * switch on `/products` reproduced every time.
 *
 * The rule: a GATED call to one of these endpoints (its `immediate` is
 * anything but absent or `true` — a page whose whole point is the
 * logged-in view may fetch freely) whose options carry anything
 * reactive sets `watch: false` and is driven by an explicit, gated
 * watcher instead. Read off the script AST, so every call in a file is
 * checked and a comment or a neighbouring call cannot satisfy it.
 */

/** Endpoints that answer 401 without a session. */
const AUTH_REQUIRED = [
  '/api/products/favourites/favourites-by-products',
  '/api/blog/posts/liked-posts',
  '/api/blog/comments/liked-comments',
]

/** The fetchers that watch their options. */
const WATCHING_FETCHER = /^use(Lazy)?Api$/

/** Options Nuxt watches: a change to any of them refetches. */
const WATCHED_OPTIONS = ['key', 'body', 'query', 'params']

/**
 * Could this value change after setup? A literal is a snapshot; an
 * identifier may be a ref or computed, and a call or a getter is
 * reactive by construction. A `.value` read is treated as a snapshot,
 * which is only right for a primitive — a ref holding an array or an
 * object hands useFetch's deep watcher a reactive proxy. The AST cannot
 * tell the two apart; conservative everywhere else, a false positive
 * costs a `watch: false`, a false negative a 401 storm.
 */
function mayChange(node: AstNode | undefined): boolean {
  if (!node) return false
  switch (node.type) {
    case 'StringLiteral': case 'NumericLiteral': case 'BooleanLiteral': case 'NullLiteral':
    case 'MemberExpression': case 'OptionalMemberExpression':
      return false
    case 'TemplateLiteral':
      return node.expressions.some(mayChange)
    case 'ArrayExpression':
      return node.elements.some(mayChange)
    case 'ObjectExpression':
      return node.properties.some((p: AstNode) => p.type !== 'ObjectProperty' || mayChange(p.value))
    default:
      return true
  }
}

interface Call { site: string, gated: boolean, reactive: boolean, watchOff: boolean }

let calls: Call[]

beforeAll(() => {
  calls = vueFiles(APP).flatMap(file =>
    callsIn(file, WATCHING_FETCHER).flatMap(({ call, line }) => {
      const url = staticText(call.arguments[0])
      if (!url || !AUTH_REQUIRED.some(endpoint => url.includes(endpoint))) return []
      const options = call.arguments[1]
      const immediate = propertyOf(options, 'immediate')
      const watch = propertyOf(options, 'watch')
      return [{
        site: `${appLabel(file)}:${line}`,
        gated: immediate !== undefined && !(immediate.type === 'BooleanLiteral' && immediate.value === true),
        reactive: WATCHED_OPTIONS.some(key => mayChange(propertyOf(options, key))),
        watchOff: watch?.type === 'BooleanLiteral' && watch.value === false,
      }]
    }),
  )
})

describe('auth-required fetches', () => {
  it('never leave option-watching on when they are gated', () => {
    const offenders = calls
      .filter(call => call.gated && call.reactive && !call.watchOff)
      .map(call => call.site)

    expect(
      offenders,
      'a reactive key or body will refetch these for anonymous visitors — set watch: false',
    ).toEqual([])
  })

  it('still covers the gated, reactive calls it is meant to watch', () => {
    // A rule matching nothing passes forever. These are the list pages
    // and the product page, in both the default and the frozen tree.
    expect(calls.filter(call => call.gated && call.reactive).length).toBeGreaterThanOrEqual(4)
  })
})
