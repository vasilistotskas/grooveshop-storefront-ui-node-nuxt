import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * The page builder's staff session (`server/utils/builderSession.ts`) is
 * read ONLY by `server/api/builder/**`, and none of the routes that read it is cached.
 *
 * The storefront's SSR and handler caches hold ANONYMOUS renders, replayed
 * to every visitor of a store. A page or route that read the staff cookie
 * would put one staff member's view, or their token's reach, into an entry
 * the next visitor is served; so nothing else may name the session, the
 * cookie or the guard, and a builder route never goes through a cache.
 */
const SESSION_NAMES = /\b(?:BUILDER_SESSION_COOKIE|readBuilderSession|writeBuilderSession|clearBuilderSession|requireBuilderStaff)\b/

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

  it('is not the cookie of the customer session', () => {
    const { source } = sourceFiles.find(({ path }) => path === 'shared/constants/builderSession.ts')!

    expect(source).not.toContain('nuxt-session')
  })
})
