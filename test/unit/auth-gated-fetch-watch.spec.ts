import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'
import { withoutComments } from '../helpers/sourceText'

/**
 * An auth-required fetch must not be left to auto-refetch.
 *
 * `useFetch`/`useLazyFetch` watch their reactive options. `immediate`
 * only gates the FIRST call, so a computed `key` or a reactive `body`
 * re-fires the request on every change — including for anonymous
 * visitors, against an endpoint that answers 401.
 *
 * This has now happened twice. 2026-07-04: `Blog/Posts/List.vue` posted
 * to `/api/blog/posts/liked-posts` on every pagination change, 7 calls
 * in 13 seconds per anonymous browsing session. 2026-09-21: the same
 * shape in `Products/List.vue` against
 * `/api/products/favourites/favourites-by-products`, which a language
 * switch on `/products` reproduced every time.
 *
 * The rule: a call to one of these endpoints sets `watch: false` and is
 * driven by an explicit, gated watcher instead.
 */
const APP = resolve(__dirname, '../../app')

/** Endpoints that answer 401 without a session. */
const AUTH_REQUIRED = [
  '/api/products/favourites/favourites-by-products',
  '/api/blog/posts/liked-posts',
  '/api/blog/comments/liked-comments',
]

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** The options object of the `use*Fetch` call wrapping this endpoint. */
function optionsAround(source: string, at: number): string {
  const start = source.lastIndexOf('use', at)
  return source.slice(start, start + 900)
}

describe('auth-required fetches', () => {
  it('never leave option-watching on', () => {
    const offenders = vueFilesUnder(APP).flatMap((file) => {
      const source = withoutComments(readFileSync(file, 'utf8'))
      const label = relative(APP, file).split(sep).join('/')
      return AUTH_REQUIRED.flatMap((endpoint) => {
        const at = source.indexOf(endpoint)
        if (at === -1) return []
        const options = optionsAround(source, at)
        // A page whose whole point is the logged-in view may fetch freely.
        if (!/immediate:\s*false/.test(options)) return []
        return /watch:\s*false/.test(options) ? [] : [`${label} -> ${endpoint}`]
      })
    })

    expect(
      offenders,
      'a reactive key or body will refetch these for anonymous visitors',
    ).toEqual([])
  })

  it('still covers the calls it is meant to watch', () => {
    // A rule matching nothing passes forever.
    const seen = vueFilesUnder(APP).filter(file =>
      AUTH_REQUIRED.some(e => readFileSync(file, 'utf8').includes(e)),
    )
    expect(seen.length).toBeGreaterThanOrEqual(4)
  })
})
