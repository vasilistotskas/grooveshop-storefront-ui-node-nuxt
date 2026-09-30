import { describe, it, expect, beforeAll } from 'vitest'
import { APP, FROZEN, appLabel, readSource, vueFiles, withoutComments } from '../../helpers/sourceText'

/**
 * `--ui-secondary` is the accent as a FILL. It is not a text colour.
 *
 * The token serves two roles with opposite contrast requirements. On a
 * solid surface it needs a foreground that contrasts with IT — that is
 * `--ui-on-secondary`. Used as words on the page it needs to contrast
 * with the PAGE, and there the platform blue measured 6.47:1 in light
 * mode but only 4.18:1 in dark, which is under AA on every `.article`
 * link and on the auth card. `text-accent` (`--ui-secondary-text`) is
 * the text role; `theme-stylesheet.spec.ts` checks it is defined.
 *
 * An ICON may carry the fill — it is not read as words. Everything else
 * the accent touches is. Shade variants (`text-secondary-600`) are
 * their own values and out of scope.
 *
 * The frozen `variants/webside` tree is exempt — its render is pinned.
 */
/** `text-secondary` exactly — not `text-secondary-600`. */
const FILL_AS_TEXT = /\btext-secondary(?![\w-])/
/** The line names an icon, or sizes one. */
const ICON = /icon|size-/i

interface Use { site: string, exempt: boolean }

let uses: Use[]

beforeAll(() => {
  // Checked over a small window because the class is often the far
  // branch of a multi-line ternary, with `leadingIcon:` two lines
  // above it — a single-line rule missed exactly that shape.
  uses = vueFiles(APP, { exclude: [FROZEN] }).flatMap((file) => {
    const lines = withoutComments(readSource(file)).split('\n')
    return lines.flatMap((line, index) => {
      if (!FILL_AS_TEXT.test(line)) return []
      const near = lines.slice(Math.max(0, index - 2), index + 1)
      return [{ site: `${appLabel(file)}:${index + 1}`, exempt: near.some(candidate => ICON.test(candidate)) }]
    })
  })
})

describe('the accent fill token', () => {
  it('never paints words', () => {
    expect(
      uses.filter(use => !use.exempt).map(use => use.site),
      'these use the accent FILL on words — use text-accent',
    ).toEqual([])
  })

  it('still sees the icon uses it exempts', () => {
    // A rule matching nothing passes forever.
    expect(uses.length).toBeGreaterThanOrEqual(4)
  })
})
