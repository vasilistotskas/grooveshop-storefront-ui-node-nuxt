import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * `handleError` answers an upstream 4xx by RETURNING Django's body with its
 * status, so the client sees one shape (`error.data` is the body). It is
 * typed `never` to keep the route's success type clean, which means the
 * compiler cannot tell a route that forgot the `return`: that route would
 * resolve with an empty 200 and the shopper would never learn the call
 * failed. Every call is `return handleError(event, error)`.
 */
const SERVER_ROUTES = ['server/api', 'server/routes'].map(dir => resolve(REPO, dir))

function routeFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter(entry => entry.endsWith('.ts'))
    .map(entry => resolve(dir, entry))
}

const calls = SERVER_ROUTES.flatMap(routeFiles).flatMap((file) => {
  const source = withoutComments(readFileSync(file, 'utf-8'))
  return [...source.matchAll(/(?<before>[^\n]*?)\bhandleError\(/g)].map(match => ({
    file: file.replaceAll('\\', '/').slice(REPO.replaceAll('\\', '/').length + 1),
    returned: /\breturn\s+(?:await\s+)?$/.test(match.groups!.before!),
  }))
})

describe('handleError in the server routes', () => {
  it('is found in the routes (the rule has not gone blind)', () => {
    expect(calls.length).toBeGreaterThan(100)
  })

  it('is always returned', () => {
    expect(calls.filter(call => !call.returned).map(call => call.file)).toEqual([])
  })
})
