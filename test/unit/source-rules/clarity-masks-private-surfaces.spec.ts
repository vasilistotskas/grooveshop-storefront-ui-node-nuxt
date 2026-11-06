import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP, sfcTemplate, walkElements } from '../../helpers/sourceText'
import type { ElementNode } from '../../helpers/sourceText'

/**
 * What a Microsoft Clarity recording must not read.
 *
 * Clarity's default mode hides input values, numbers and email addresses, and
 * sends the rest of the page to Microsoft: a shopper's name, street address and
 * photo included. `data-clarity-mask` masks an element and all it contains in
 * the browser, so the content is never uploaded
 * (learn.microsoft.com/clarity/setup-and-installation/clarity-masking).
 *
 * A private surface carries it in every design, around what is private: a
 * mask that moves off that content fails here, not only one that is removed.
 */
interface Surface {
  file: string
  /** Elements that show private content, by tag. */
  tags?: string[]
  /** Template expressions that show private content. */
  expressions?: string[]
}

const PRIVATE_SURFACES: Surface[] = [
  { file: 'layouts/checkout.vue', tags: ['slot'] },
  { file: 'components/Chrome/AccountShell.vue', tags: ['slot', 'UAvatar'] },
  { file: 'components/variants/webside/Chrome/AccountShell.vue', tags: ['slot'] },
  { file: 'components/Storefront/CheckoutSuccess.vue', tags: ['UContainer'] },
  { file: 'components/variants/webside/Storefront/CheckoutSuccess.vue', tags: ['WebsidePageWrapper'] },
  { file: 'components/Chrome/AccountMenu.vue', expressions: ['menu.avatarSrc.value', 'menu.name.value', 'menu.email.value'] },
  { file: 'components/Chrome/AccountSheet.vue', expressions: ['menu.avatarSrc.value', 'menu.name.value', 'standing'] },
  { file: 'components/Chrome/MobileMenuAccount.vue', tags: ['UAvatar'], expressions: ['user?.email'] },
  { file: 'components/variants/webside/Page/BurgerMenu.vue', tags: ['UserAvatar'], expressions: ['greetingName', 'user?.email'] },
  { file: 'components/variants/webside/Page/Navbar.vue', tags: ['UserAvatar'], expressions: ['t(\'email.title\')'] },
]

const isMask = (node: ElementNode) => node.props.some(prop => prop.name === 'data-clarity-mask')

/** The expressions an element shows itself: its `{{ }}` and its bound props. */
function expressionsOf(node: ElementNode): string[] {
  const shown: string[] = []
  for (const child of node.children) {
    if ('content' in child && child.type === 5) shown.push(child.content.loc.source)
  }
  for (const prop of node.props) {
    if ('exp' in prop && prop.exp && prop.name === 'bind') shown.push(prop.exp.loc.source)
  }
  return shown
}

/** Every place a surface shows `matches`, and whether a mask covers it. */
function sites(file: string, matches: (node: ElementNode) => boolean): boolean[] {
  const found: boolean[] = []
  walkElements(sfcTemplate(resolve(APP, file)), (node, ancestors) => {
    if (matches(node)) found.push(isMask(node) || ancestors.some(isMask))
  })
  return found
}

describe('Microsoft Clarity masking', () => {
  describe.each(PRIVATE_SURFACES)('$file', ({ file, tags = [], expressions = [] }) => {
    it.each(tags)('masks every <%s>', (tag) => {
      const found = sites(file, node => node.tag === tag)
      // A renamed element must not turn this into a check of nothing.
      expect(found.length).toBeGreaterThan(0)
      expect(found).not.toContain(false)
    })

    it.each(expressions)('masks everywhere it shows %s', (expression) => {
      const found = sites(file, node => expressionsOf(node).some(shown => shown.includes(expression)))
      expect(found.length).toBeGreaterThan(0)
      expect(found).not.toContain(false)
    })
  })
})
