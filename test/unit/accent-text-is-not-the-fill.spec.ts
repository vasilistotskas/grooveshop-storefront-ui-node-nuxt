import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep, join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * `--ui-secondary` is the accent as a FILL. It is not a text colour.
 *
 * The token serves two roles with opposite contrast requirements. On a
 * solid surface it needs a foreground that contrasts with IT — that is
 * `--ui-on-secondary`. Used as words on the page it needs to contrast
 * with the PAGE, and there the platform blue measured 6.47:1 in light
 * mode but only 4.18:1 in dark, which is under AA on every `.article`
 * link and on the auth card.
 *
 * `--ui-secondary-text` is the text role, derived from the accent so a
 * tenant theme that overrides `--ui-secondary` gets a correct value
 * without knowing this rule exists. `text-accent` is the utility.
 *
 * An ICON may carry the fill — it is not read as words. Everything else
 * the accent touches is. Shade variants (`text-secondary-600`) are
 * their own values and out of scope.
 *
 * The frozen `variants/webside` tree is exempt — its render is pinned.
 */
const ROOT = resolve(__dirname, '../../app')
/** `text-secondary` exactly — not `text-secondary-600`. */
const FILL_AS_TEXT = /\btext-secondary(?![\w-])/
/** The line names an icon, or sizes one. */
const ICON = /icon|size-/i

/**
 * Blank out comment bodies, keeping the line count intact.
 *
 * Without this the rule fires on its own documentation: the loyalty
 * page carries a comment explaining that `.article` used to paint every
 * anchor with the fill token, and the prose of that explanation is not
 * a class attribute.
 */
function withoutComments(source: string): string {
  const blank = (match: string) => match.replace(/[^\r\n]/g, ' ')
  return source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\r\n]*/g, match => match[0] + blank(match.slice(1)))
}

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('the accent used as text', () => {
  it('goes through --ui-secondary-text, in both colour schemes', () => {
    const css = readFileSync(join(ROOT, 'assets/css/main.css'), 'utf8')
    const definitions = css.match(/--ui-secondary-text:/g) ?? []
    expect(
      definitions.length,
      'one definition means the other scheme falls back to the fill',
    ).toBeGreaterThanOrEqual(2)
    expect(css).toMatch(/@utility text-accent/)
  })

  it('derives the dark value rather than hardcoding one', () => {
    // A fixed light blue would be wrong for every tenant but this one.
    const css = readFileSync(join(ROOT, 'assets/css/main.css'), 'utf8')
    expect(css).toMatch(
      /--ui-secondary-text:\s*color-mix\([^)]*var\(--ui-secondary\)/,
    )
  })

  it('is what `.article` links use', () => {
    // Blog, CMS and legal body copy is where most links on the site
    // live, and it is authored HTML — no component can fix it.
    const css = readFileSync(join(ROOT, 'assets/css/main.css'), 'utf8')
    expect(css).toMatch(/a \{ @apply text-accent/)
  })

  it('never paints words with the fill token', () => {
    // Checked over a small window because the class is often the far
    // branch of a multi-line ternary, with `leadingIcon:` two lines
    // above it — a single-line rule missed exactly that shape.
    const offenders = vueFilesUnder(ROOT)
      .filter(file => !relative(ROOT, file).split(sep).includes('variants'))
      .flatMap((file) => {
        const label = relative(ROOT, file).split(sep).join('/')
        const lines = withoutComments(readFileSync(file, 'utf8')).split('\n')
        return lines
          .map((line, index) => ({ line, index }))
          .filter(({ line, index }) => {
            if (!FILL_AS_TEXT.test(line)) return false
            const near = lines.slice(Math.max(0, index - 2), index + 1)
            return !near.some(candidate => ICON.test(candidate))
          })
          .map(({ index }) => `${label}:${index + 1}`)
      })

    expect(
      offenders,
      'these use the accent FILL on words — use text-accent',
    ).toEqual([])
  })
})
