import { describe, it, expect, beforeAll } from 'vitest'
import {
  APP,
  FROZEN,
  appLabel,
  boundAttribute,
  classesOf,
  parseExpression,
  sfcScriptAsts,
  sfcTemplate,
  vueFiles,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

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
 * The rule is mechanical because the distinction is: a class list that
 * also carries a text-size utility is text, and a bare `text-dimmed` on
 * a `size-4` icon is decoration and stays allowed.
 *
 * A class list is one element's `class`/`:class`, or one string in a
 * `:ui` binding or the script (a slot's classes) — so a `class="…"`
 * split over several lines is still one list, and a comment naming the
 * classes is not one at all.
 *
 * The frozen `variants/webside` tree is exempt — its render is pinned,
 * and a colour change there would be a redesign of a live store.
 */
const DIMMED = /(?:^|[\s'"`:])text-dimmed(?:$|[\s'"`])/
const TEXT_SIZE = /(?:^|[\s'"`:])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?:$|[\s'"`])/

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
          lists.push({ site: `${appLabel(file)}:${lineOffset + node.loc.start.line}`, classes })
        }
      })
    }
    return lists.filter(list => DIMMED.test(list.classes))
  })
})

describe('text-dimmed', () => {
  it('never colours something the customer has to read', () => {
    expect(
      classLists.filter(list => TEXT_SIZE.test(list.classes)).map(list => list.site),
      'these sit below AA on both surfaces — use text-muted',
    ).toEqual([])
  })

  it('still sees the decorative uses it allows', () => {
    // Template, :ui-less script constant and a page: a rule reading
    // none of them passes forever.
    expect(classLists.length).toBeGreaterThanOrEqual(3)
  })
})
