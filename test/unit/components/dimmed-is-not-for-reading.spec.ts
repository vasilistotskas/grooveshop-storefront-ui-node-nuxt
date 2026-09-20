import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * `text-dimmed` is ornament, not copy.
 *
 * Nuxt UI's dimmed token measures 2.5:1 against `bg-default` in light
 * mode and 3.7:1 in dark — below AA either way — while `text-muted` is
 * the step that passes in both. The demo store's audit found it on
 * twelve elements, ten of which were things a customer has to READ: the
 * struck-through old price on every card and product page, the "incl.
 * VAT" note under it, the product count above a category, the footer
 * copyright.
 *
 * The rule is mechanical because the distinction is: an element that
 * also carries a text-size utility is text, and a bare `text-dimmed` on
 * a `size-4` icon is decoration and stays allowed.
 *
 * The frozen `variants/webside` tree is exempt — its render is pinned,
 * and a colour change there would be a redesign of a live store.
 */
const ROOT = resolve(__dirname, '../../../app')
const TEXT_SIZE = /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('text-dimmed', () => {
  const offenders = vueFilesUnder(ROOT)
    .filter(file => !relative(ROOT, file).split(sep).includes('variants'))
    .flatMap((file) => {
      const label = relative(ROOT, file).split(sep).join('/')
      return readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.includes('text-dimmed') && TEXT_SIZE.test(line))
        .map(({ index }) => `${label}:${index + 1}`)
    })

  it('never colours something the customer has to read', () => {
    expect(
      offenders,
      'these sit below AA on both surfaces — use text-muted',
    ).toEqual([])
  })
})
