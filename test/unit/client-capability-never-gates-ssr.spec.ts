import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'
import { withoutComments } from '../helpers/sourceText'

/**
 * A capability the server cannot detect must not decide SSR markup.
 *
 * `useClipboard().isSupported` is `false` while rendering — there is no
 * `navigator` — and `true` the instant the client evaluates it. A
 * `v-if` on it therefore renders nothing on the server and a button
 * during hydration, which is a mismatch: measured on staging
 * 2026-09-21, `/offers` gained five "Αντιγραφή κωδικού" buttons
 * between the server's DOM and the hydrated one, and the product page
 * did the same for its offer rows. Both logged "Hydration completed
 * but contains mismatches" at every width.
 *
 * `<ClientOnly>` is the answer: it renders nothing on the server AND
 * nothing on the client's hydration pass, then mounts. The `v-if`
 * stays inside it, so a browser without clipboard support still gets
 * no dead button.
 *
 * Scoped to clipboard support because that is what was measured. The
 * rule generalises — `navigator.share`, `matchMedia`, storage — and
 * this file is the place to add the next one.
 */
const APP = resolve(__dirname, '../../app')

/** `const { isSupported: NAME } = useClipboard()` / `{ isSupported }`. */
const BINDING = /const\s*\{[^}]*\bisSupported\b(?:\s*:\s*(\w+))?[^}]*\}\s*=\s*useClipboard\(/

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/**
 * Lines where `v-if="<name>"` sits outside every `<ClientOnly>`.
 *
 * Depth-counted rather than proximity-matched: the button is several
 * lines of props away from its wrapper, and a "within N lines" rule
 * would pass a `</ClientOnly>` that had already closed.
 */
function ungatedUses(source: string, name: string): number[] {
  const lines = withoutComments(source).split('\n')
  const guard = new RegExp(`v-if="\\s*${name}\\s*"`)
  const offenders: number[] = []
  let depth = 0

  for (const [index, line] of lines.entries()) {
    if (guard.test(line) && depth === 0) offenders.push(index + 1)
    depth += (line.match(/<ClientOnly[\s>]/g) ?? []).length
    depth -= (line.match(/<\/ClientOnly>/g) ?? []).length
  }
  return offenders
}

describe('clipboard support', () => {
  it('never decides what the server renders', () => {
    const offenders = vueFilesUnder(APP).flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const binding = withoutComments(source).match(BINDING)
      if (!binding) return []

      const name = binding[1] ?? 'isSupported'
      const label = relative(APP, file).split(sep).join('/')
      return ungatedUses(source, name).map(line => `${label}:${line}`)
    })

    expect(
      offenders,
      'these gate SSR markup on a client-only capability — wrap in <ClientOnly>',
    ).toEqual([])
  })

  it('still finds the components it is meant to be watching', () => {
    // A rule that silently matches nothing passes forever. These four
    // are the files the mismatch was measured in.
    const watched = vueFilesUnder(APP).filter(file =>
      BINDING.test(withoutComments(readFileSync(file, 'utf8'))),
    )

    expect(watched.length).toBeGreaterThanOrEqual(4)
  })
})
