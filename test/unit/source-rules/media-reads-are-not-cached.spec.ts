import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, withoutComments } from '../../helpers/sourceText'

/**
 * A staff or share-link read of the media library must never go through a
 * cache. Its answer is for one staff member (any asset of the library) or
 * one link (the assets of its frozen drafts); stored under a name any
 * visitor's page reads, it would hand an unpublished image to the next one.
 * The server harness's `defineCachedFunction` never stores anything
 * (`test/helpers/nitro/runtime.ts`), so no behavioural spec can see this
 * break: the source is what is held.
 *
 * Every `cachedRead(...)` / `defineCachedFunction(...)` call of the data
 * resolver is read whole, and none may name the staff or share endpoints or
 * take their credentials.
 */
const DIR = 'server/utils/builderData'
const CACHED_CALL = /\b(?:cachedRead|defineCachedFunction)\s*\(/g
const FORBIDDEN = /staff-resolve|preview-media|staffHeaders|shareToken|readStaffMedia|readSharedMedia/

/** The text of the call whose `(` is at `open`: up to its matching `)`. */
function callBody(source: string, open: number): string {
  let depth = 0
  for (let at = open; at < source.length; at++) {
    if (source[at] === '(') depth++
    else if (source[at] === ')' && --depth === 0) return source.slice(open, at + 1)
  }
  return source.slice(open)
}

const cachedCalls = (source: string) => [...source.matchAll(CACHED_CALL)].map(match => callBody(source, match.index + match[0].length - 1))

const files = (readdirSync(resolve(REPO, DIR), { recursive: true }) as string[])
  .filter(entry => entry.endsWith('.ts'))
  .map(entry => ({ path: `${DIR}/${entry}`.replaceAll('\\', '/'), source: withoutComments(readFileSync(resolve(REPO, DIR, entry), 'utf-8')) }))

describe('the reads of the media library', () => {
  it('is found where it lives (the rule has not gone blind)', () => {
    const calls = files.flatMap(({ source }) => cachedCalls(source))

    expect(calls.length).toBeGreaterThanOrEqual(6)
    expect(calls.filter(call => call.includes('builderDataMedia') && call.includes('/builder/media/resolve'))).toHaveLength(1)
    expect(files.some(({ source }) => /staff-resolve/.test(source) && /preview-media/.test(source))).toBe(true)
  })

  it('names the staff and share endpoints in no cached read', () => {
    const offenders = files.flatMap(({ path, source }) => cachedCalls(source).filter(call => FORBIDDEN.test(call)).map(() => path))

    expect(offenders).toEqual([])
  })
})
