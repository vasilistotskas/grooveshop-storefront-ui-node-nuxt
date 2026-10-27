import { describe, expect, it, beforeAll } from 'vitest'
import { FROZEN, appLabel, callsIn, vueFiles } from '../../helpers/sourceText'

/**
 * The frozen `webside` tree fetches nothing itself.
 *
 * Its freeze covers the look only (owner decision 2026-10-23): what a page
 * reads, which gate it applies and how a failure is told follow the
 * platform. Each copy used to fetch for itself, so a fix to the default
 * never reached webside (storefront #153); the consolidation moved every
 * request into the composables both trees use. This keeps it that way: a
 * request a webside copy needs goes into the shared composable, where the
 * default's fix lands too.
 *
 * Read off the parsed scripts, so a comment or a string cannot trip it.
 */
const FETCHER = /^(?:\$api|useApi|useLazyApi|useRequestApi|useAsyncData|useLazyAsyncData|\$fetch|useFetch|useLazyFetch|useRequestFetch)$/

let files: string[]
let fetches: string[]

beforeAll(() => {
  files = vueFiles(FROZEN)
  fetches = files.flatMap(file => callsIn(file, FETCHER).map(({ call, line }) => `${appLabel(file)}:${line} ${call.callee.name}`))
})

describe('the frozen webside tree', () => {
  it('reads the whole tree', () => {
    // A guard on the guard: a moved tree must not empty the scan.
    expect(files.length).toBeGreaterThan(200)
  })

  it('makes no request of its own: the shared composables do', () => {
    expect(fetches).toEqual([])
  })
})
