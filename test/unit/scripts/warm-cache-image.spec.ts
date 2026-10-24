import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO } from '../../helpers/sourceText'

/**
 * The warm-up runs from the production image, which holds `.output` and
 * only the files `docker/Dockerfile` copies beside it. The script imports
 * the page-cache route lists as TypeScript (`hasExtractedPayload`), so every
 * file in its import graph must be copied to the path the import names, or
 * the PostSync hook dies on its first line and the sync fails.
 */
const SCRIPT = resolve(REPO, 'scripts/warm-cache.mjs')
const RELATIVE_IMPORT = /^\s*import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/gm

function importGraph(entry: string, seen = new Set<string>()): Set<string> {
  for (const match of readFileSync(entry, 'utf8').matchAll(RELATIVE_IMPORT)) {
    const file = resolve(dirname(entry), match[1]!)
    if (!seen.has(file)) {
      seen.add(file)
      importGraph(file, seen)
    }
  }
  return seen
}

const label = (file: string) => relative(REPO, file).replaceAll('\\', '/')
const dockerfile = readFileSync(resolve(REPO, 'docker/Dockerfile'), 'utf8')
const copied = (path: string) => dockerfile.includes(`COPY --from=build --chown=node:node /app/${path} ./${path}`)

describe('the warm-up in the production image', () => {
  it('ships the script itself', () => {
    expect(copied(label(SCRIPT))).toBe(true)
  })

  it('ships every file the script imports, at the path it imports it from', () => {
    const files = [...importGraph(SCRIPT)].map(label)

    expect(files).toContain('shared/constants/prerender.ts')
    expect(files.filter(file => !copied(file))).toEqual([])
  })
})
