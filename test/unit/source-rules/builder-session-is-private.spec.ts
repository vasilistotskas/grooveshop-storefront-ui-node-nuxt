import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * The page builder's staff session (`server/utils/builderSession.ts`) is
 * read ONLY by `server/api/builder/**`, and none of the routes that read it
 * is cached; and by the CSP middleware, for one answer: whether a page asked
 * for as the editor's preview may be framed (`builderCanvasFraming`).
 *
 * The storefront's SSR and handler caches hold ANONYMOUS renders, replayed
 * to every visitor of a store. A page or route that read the staff cookie
 * would put one staff member's view, or their token's reach, into an entry
 * the next visitor is served; so nothing else may name the session, the
 * cookie or the guard, and a builder route never goes through a cache.
 *
 * The middleware is the one reader outside the routes because it runs on
 * the request itself, before Nitro's page cache: the cached render is handed
 * only the `varies` headers, never the cookie, and the framing headers it
 * writes go on that one response, which is private
 * (`server/utils/edgeCache.ts`).
 */
const SESSION_NAMES = /\b(?:BUILDER_SESSION_COOKIE|readBuilderSession|writeBuilderSession|clearBuilderSession|requireBuilderStaff|builderCanvasFraming)\b/

/** The one file outside the builder routes that may ask about the session, and only who may frame. */
const FRAMING_READER = 'server/middleware/3.csp.ts'

const toPath = (file: string) => file.replaceAll('\\', '/').slice(REPO.replaceAll('\\', '/').length + 1)

const sourceFiles = ['app', 'server', 'shared', 'runtime', 'modules'].flatMap(dir =>
  (readdirSync(resolve(REPO, dir), { recursive: true }) as string[])
    .filter(entry => /\.(?:ts|vue)$/.test(entry))
    .map(entry => resolve(REPO, dir, entry)),
).map(file => ({ path: toPath(file), source: withoutComments(readFileSync(file, 'utf-8')) }))

const mayReadSession = (path: string) =>
  path === 'server/utils/builderSession.ts'
  || path === 'shared/constants/builderSession.ts'
  || path.startsWith('server/api/builder/')
  || path === FRAMING_READER

describe('the builder staff session', () => {
  it('is found where it lives (the rule has not gone blind)', () => {
    expect(sourceFiles.length).toBeGreaterThan(500)
    expect(sourceFiles.filter(({ path }) => SESSION_NAMES.test(readFileSync(resolve(REPO, path), 'utf-8'))).map(({ path }) => path))
      .toContain('server/api/builder/session.get.ts')
  })

  it('is named by nothing outside the builder routes and its own module', () => {
    const offenders = sourceFiles.filter(({ path, source }) => !mayReadSession(path) && SESSION_NAMES.test(source)).map(({ path }) => path)

    expect(offenders).toEqual([])
  })

  it('is never named by a builder route that goes through a cache', () => {
    const cached = sourceFiles.filter(({ path, source }) =>
      path.startsWith('server/api/builder/')
      && SESSION_NAMES.test(source)
      && /\bdefine(?:CachedRoute|CachedEventHandler|CachedFunction)\b/.test(source))

    expect(cached.map(({ path }) => path)).toEqual([])
  })

  it('is asked only who may frame by the CSP middleware, which no cache wraps', () => {
    const { source } = sourceFiles.find(({ path }) => path === FRAMING_READER)!
    const named = [...source.matchAll(new RegExp(SESSION_NAMES.source, 'g'))].map(([name]) => name)

    expect([...new Set(named)]).toEqual(['builderCanvasFraming'])
    expect(source).not.toMatch(/\bdefine(?:CachedRoute|CachedEventHandler|CachedFunction)\b/)
  })

  it('is not the cookie of the customer session', () => {
    const { source } = sourceFiles.find(({ path }) => path === 'shared/constants/builderSession.ts')!

    expect(source).not.toContain('nuxt-auth-session')
  })
})
