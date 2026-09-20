/**
 * Anything painted in the tenant accent gets white on top of it.
 *
 * Nuxt UI pairs a solid colour with `text-inverted`, which is white in
 * light mode and near-BLACK in dark. That works for its own palette,
 * whose tokens flip between modes, but `--ui-secondary` is a tenant's
 * brand colour and stays a mid blue in both — so the dark-mode pairing
 * came out dark-on-blue. Measured on the demo store: 3.72:1 on the
 * catalogue's "New" badge and 4.18:1 on the offers page's "Gift" one,
 * both below AA.
 *
 * `--ui-on-secondary` is the token that exists to answer "what goes on
 * top of the accent", and it is white in both modes by definition. Each
 * component that can be painted solid-secondary needs its own compound
 * variant saying so — there is no inheritance between them, which is
 * exactly why the badge kept the broken default for months after the
 * button was fixed.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..')
const appConfig = readFileSync(join(root, 'app/app.config.ts'), 'utf8')
const css = readFileSync(join(root, 'app/assets/css/main.css'), 'utf8')

/** The `compoundVariants` entry pairing solid secondary with a text colour. */
function solidSecondaryClass(component: string): string | undefined {
  const at = appConfig.indexOf(`${component}: {`)
  if (at === -1) return undefined
  const block = appConfig.slice(at, at + 2000)
  const entry = block.match(
    /color:\s*'secondary',\s*\n\s*variant:\s*'solid',\s*\n\s*class:\s*'([^']*)'/,
  )
  return entry?.[1]
}

describe('solid secondary', () => {
  for (const component of ['button', 'badge']) {
    it(`puts --ui-on-secondary on a ${component}`, () => {
      expect(
        solidSecondaryClass(component),
        `${component} has no solid-secondary compound variant`,
      ).toContain('text-(--ui-on-secondary)')
    })
  }

  it('defines that token for both colour schemes', () => {
    // Two definitions: the `:root` block and the dark-mode one. A single
    // one would mean the other scheme falls back to Nuxt UI's default.
    const definitions = css.match(/--ui-on-secondary:/g) ?? []
    expect(definitions.length).toBeGreaterThanOrEqual(2)
  })
})
