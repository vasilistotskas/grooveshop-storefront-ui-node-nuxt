import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'node:path'
import {
  APP,
  FROZEN,
  appLabel,
  boundAttribute,
  classesOf,
  parseExpression,
  readSource,
  sfcScriptAsts,
  sfcTemplate,
  vueFiles,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

/**
 * Volt is a fill, never a text colour.
 *
 * `#D6F94A` on white reads at 1.2:1, so the design uses it as a fill
 * with ink on it (`bg-volt text-on-volt`) — the discount badge, the
 * hero's badge and CTA, the offers link. Where it sets volt as TYPE, it
 * is on the ink surface (the offers band's eyebrow and figures), and
 * that goes through `--ui-volt-on-inverted` (`app/assets/css/main.css`),
 * which falls back to the surface's own text in dark mode, where the
 * inverted surface is light and volt would vanish into it.
 *
 * A class list is one element's `class`/`:class`, or one string in a
 * `:ui` binding or the script — the same reading as
 * `dimmed-is-not-for-reading.spec.ts`. The frozen `variants/webside`
 * tree never had volt and is not read.
 */
const TEXT_VOLT = /(?:^|[\s'"`:])text-volt(?:$|[\s'"`/])/
const BG_VOLT = /(?:^|[\s'"`:])bg-volt(?:$|[\s'"`/])/

/** Every string and template-literal chunk in an expression or module. */
function stringsIn(root: AstNode): string[] {
  const out: string[] = []
  walkAst(root, (node) => {
    if (node.type === 'StringLiteral') out.push(node.value)
    else if (node.type === 'TemplateElement') out.push(node.value.cooked ?? '')
  })
  return out
}

let classLists: Array<{ site: string, classes: string }>

beforeAll(() => {
  classLists = vueFiles(APP, { exclude: [FROZEN] }).flatMap((file) => {
    const lists: Array<{ site: string, classes: string }> = []
    walkElements(sfcTemplate(file), (node) => {
      const site = `${appLabel(file)}:${node.loc.start.line}`
      lists.push({ site, classes: classesOf(node) })
      const ui = boundAttribute(node, 'ui')
      if (ui) for (const classes of stringsIn(parseExpression(ui))) lists.push({ site, classes })
    })
    for (const { program, lineOffset } of sfcScriptAsts(file)) {
      walkAst(program, (node) => {
        if (node.type === 'StringLiteral' || node.type === 'TemplateElement') {
          const classes = node.type === 'StringLiteral' ? node.value : node.value.cooked ?? ''
          lists.push({ site: `${appLabel(file)}:${lineOffset + node.loc!.start.line}`, classes })
        }
      })
    }
    return lists
  })
})

describe('volt', () => {
  it('is never a text colour', () => {
    expect(
      classLists.filter(list => TEXT_VOLT.test(list.classes)).map(list => list.site),
      'volt on white reads at 1.2:1 — fill with bg-volt text-on-volt, or on ink use text-(--ui-volt-on-inverted)',
    ).toEqual([])
  })

  it('as type falls back to the surface\'s own text where the ink surface turns light', () => {
    // Volt on ink, the inverted text in dark mode: one without the other
    // is volt type on a light surface.
    const css = readSource(resolve(APP, 'assets/css/main.css'))
    const block = (selector: string) => css.slice(css.indexOf(`${selector} {`)).split(/\r?\n\}/)[0]!

    expect(block('[data-design="volt"]')).toContain('--ui-volt-on-inverted: var(--color-volt);')
    expect(block('[data-design="volt"]:where(.dark)')).toContain('--ui-volt-on-inverted: var(--ui-text-inverted);')
  })

  it('still sees the fills it allows', () => {
    // The badges, the footer, the offers link, the hero: a rule reading
    // none of the class lists passes forever.
    expect(classLists.filter(list => BG_VOLT.test(list.classes)).length).toBeGreaterThanOrEqual(5)
  })
})
