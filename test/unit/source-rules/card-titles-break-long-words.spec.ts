import { describe, it, expect } from 'vitest'
import { basename, dirname } from 'node:path'
import { COMPONENTS, classesOf, isElement, relativeLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'
import type { ElementNode, TemplateChildNode } from '../../helpers/sourceText'

/**
 * A card's heading that prints a name someone wrote (a post's title, a
 * product's name, an offer's, a saved address's) breaks a word too long
 * for its line.
 *
 * Such a name may hold a word wider than a phone's card: 25 Greek letters
 * at the size of webside's phone article card are 380px. Without a break
 * the word overflows the heading; where the heading is a grid sized by its
 * content (webside's `Blog/Post/Card/Mobile`) the whole page then scrolls
 * sideways (406px at 320, measured 2026-11-13), and where the card or a
 * line clamp clips its overflow (both designs' `Product/Card`) the name
 * is cut mid-word. `wrap-anywhere`
 * breaks the word at the line's end and, unlike `wrap-break-word`, lets a
 * box sized by its content shrink below the word, which the phone article
 * card needs to keep its own width. It is inherited, so it sits on the
 * heading and reaches the text inside it.
 *
 * The cards are both designs' card components: a file named `*Card*.vue`
 * or in a `Card/` folder, and `Blog/Rail`, which draws its cards itself. A heading prints such a name when it holds an
 * interpolation that is not a translation (`t(…)`), or an element whose
 * text is bound (`:text`, as `Anchor` takes it). A heading that truncates
 * to one line (`truncate`) ends a long word with an ellipsis instead.
 */
const CARD_FILES = vueFiles(COMPONENTS).filter(file =>
  /Card/.test(basename(file)) || basename(dirname(file)) === 'Card' || relativeLabel(COMPONENTS, file) === 'Blog/Rail.vue')

/** Headings whose interpolation is never a name someone wrote, and why. */
const EXEMPT = new Map([
  ['variants/webside/Form/CardHeader.vue', 'its `title` is the caller\'s translated copy'],
])

const TRANSLATION = /^\s*\$?t\(/

/** Whether an element's subtree prints text someone wrote. */
function printsWrittenText(node: ElementNode): boolean {
  const visit = (child: TemplateChildNode): boolean => {
    if (child.type === 5) return !TRANSLATION.test('content' in child.content ? String(child.content.content) : '')
    if (!isElement(child)) return false
    if (child.props.some(prop => prop.type === 7 && prop.name === 'bind' && prop.arg && 'content' in prop.arg && prop.arg.content === 'text')) return true
    return child.children.some(visit)
  }
  return visit(node)
}

const hasClass = (node: ElementNode, name: string) => classesOf(node).split(/\s+/).includes(name)

/** Whether the element's static `class` names it: a bound one may name it on one branch only. */
const hasStaticClass = (node: ElementNode, name: string) =>
  node.props.some(prop => prop.type === 6 && prop.name === 'class' && (prop.value?.content ?? '').split(/\s+/).includes(name))

function cardHeadings() {
  return CARD_FILES.filter(file => !EXEMPT.has(relativeLabel(COMPONENTS, file))).flatMap((file) => {
    const headings: Array<{ where: string, breaks: boolean }> = []
    walkElements(sfcTemplate(file), (node) => {
      if (!/^h[1-6]$/.test(node.tag) || hasClass(node, 'truncate') || !printsWrittenText(node)) return
      headings.push({ where: `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line}`, breaks: hasStaticClass(node, 'wrap-anywhere') })
    })
    return headings
  })
}

describe('card titles', () => {
  it('break a long word in every card heading that prints a written name, in both designs', () => {
    const headings = cardHeadings()

    // Canary: webside's article cards (phone and desktop), product cards
    // (catalogue and account), offer, cart item and address; the default's
    // article rail, product card, assistant product, offer,
    // address, newsletter topic and loyalty tier.
    expect(headings.length).toBeGreaterThanOrEqual(14)
    expect(headings.filter(heading => !heading.breaks).map(heading => heading.where)).toEqual([])
  })

  it('exempts only files that are still cards', () => {
    for (const file of EXEMPT.keys()) {
      expect(CARD_FILES.map(card => relativeLabel(COMPONENTS, card))).toContain(file)
    }
  })
})
