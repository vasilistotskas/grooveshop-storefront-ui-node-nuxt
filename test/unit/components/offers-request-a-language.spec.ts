import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'

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
 * The frozen `variants/webside` tree is exempt: that store serves one
 * language, and its render is pinned.
 */
const ROOT = resolve(__dirname, '../../../app/components')

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** The `useFetch(...)` call wrapping an `/api/promotions` URL. */
function offersCalls(source: string): string[] {
  const calls: string[] = []
  const marker = '/api/promotions'
  let at = source.indexOf(marker)
  while (at !== -1) {
    const open = source.lastIndexOf('useFetch(', at)
    if (open !== -1) {
      // To the matching close: the options object always ends with
      // `})` at the call's indentation, so take a generous window and
      // let the assertions read it.
      calls.push(source.slice(open, at + 600))
    }
    at = source.indexOf(marker, at + 1)
  }
  return calls
}

describe('a caller of the offers endpoints', () => {
  const files = vueFilesUnder(ROOT).filter(
    file => !relative(ROOT, file).split(sep).includes('variants'),
  )

  const callers = files
    .map(file => ({
      label: relative(resolve(__dirname, '../../../app'), file)
        .split(sep)
        .join('/'),
      calls: offersCalls(readFileSync(file, 'utf8')),
    }))
    .filter(entry => entry.calls.length > 0)

  it('finds the callers at all', () => {
    // Guards the test: a rename would otherwise make it vacuous.
    expect(callers.length).toBeGreaterThanOrEqual(3)
  })

  it('sends languageCode', () => {
    const missing = callers
      .filter(({ calls }) => calls.some(call => !call.includes('languageCode')))
      .map(({ label }) => label)

    expect(
      missing,
      'these ask Django for offers without saying which language to answer in',
    ).toEqual([])
  })

  it('keys its cache entry by locale', () => {
    const missing = callers
      .filter(({ calls }) =>
        calls.some(call => /key:\s*(?!.*locale)/.test(call.split('\n').find(l => l.includes('key:')) ?? 'key: none')),
      )
      .map(({ label }) => label)

    expect(
      missing,
      'these would serve whichever locale fetched first to every reader',
    ).toEqual([])
  })
})
