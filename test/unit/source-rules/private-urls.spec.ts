import { readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP } from '../../helpers/sourceText'
import { isPrivateUrl } from '~~/shared/utils/privateUrls'

/**
 * A page whose address holds a key must be in `isPrivateUrl`, or every tracker
 * sends the key with its hits. The name of the route's parameter says so.
 */
const PAGES = resolve(APP, 'pages')
const SECRET_PARAM = /\[(key|token|uuid)\]/
// Reached by staff only, and the builder surface runs no trackers (`app.vue`).
const NO_TRACKERS = new Set(['/_builder-preview/[token]'])

function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return routes(path)
    if (!entry.name.endsWith('.vue')) return []
    return [`/${relative(PAGES, path).replaceAll('\\', '/').replace(/\.vue$/, '').replace(/\/index$/, '')}`]
  })
}

const secretRoutes = routes(PAGES).filter(route => SECRET_PARAM.test(route) && !NO_TRACKERS.has(route))

describe('pages with a secret in their address', () => {
  it('are found', () => {
    expect(secretRoutes.length).toBeGreaterThanOrEqual(6)
  })

  it.each(secretRoutes)('%s runs no trackers', (route) => {
    expect(isPrivateUrl(route.replace(SECRET_PARAM, 'a-value'))).toBe(true)
  })
})
