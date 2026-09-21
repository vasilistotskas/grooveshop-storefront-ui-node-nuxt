import { readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { readdirSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { withoutComments } from '../helpers/sourceText'

/**
 * `UDropdownMenu` must not be lazily loaded.
 *
 * Reka's `useForwardExpose` reads
 *
 *   t.value && '$el' in t.value && ['#text','#comment'].includes(t.value.$el.nodeName)
 *
 * — it checks that `$el` exists as a KEY, never that it is non-null.
 * A `Lazy*` component renders nothing until its chunk arrives, so `$el`
 * is null in that window and the expression throws "Cannot read
 * properties of null (reading 'nodeName')".
 *
 * Measured on staging 2026-09-21: `/account/sessions` threw it once per
 * table row and hydrated with mismatches, 2 runs out of 2. The three
 * pages rendering `LazyUDropdownMenu` all mismatched; every account
 * page without it hydrated clean, which is what identified it.
 *
 * The lazy wrapper was not buying anything: `Page/Navbar.vue` renders
 * `UDropdownMenu` eagerly on every page of the site, so the component
 * is in the entry graph regardless.
 */
const APP = resolve(__dirname, '../../app')

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('the dropdown menu', () => {
  it('is never rendered through its Lazy wrapper', () => {
    const offenders = vueFilesUnder(APP).flatMap((file) => {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n')
      const label = relative(APP, file).split(sep).join('/')
      return lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /<\/?LazyUDropdownMenu\b/.test(line))
        .map(({ index }) => `${label}:${index + 1}`)
    })

    expect(
      offenders,
      'a null `$el` during lazy load throws inside Reka\'s useForwardExpose',
    ).toEqual([])
  })
})
