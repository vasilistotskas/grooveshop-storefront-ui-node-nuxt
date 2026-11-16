import { describe, it, expect } from 'vitest'
import { APP, COMPONENTS, appLabel, componentsByName, sfcScript, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'
import type { ElementNode } from '../../helpers/sourceText'

/**
 * A list item is never the direct item of another list item.
 *
 * The HTML parser closes an open `<li>` when the next `<li>` starts, so
 * `<li><li>…</li></li>` sent by the server reaches the browser as two
 * sibling items. The client's tree still nests them, and hydration finds
 * a different DOM from the one it rendered: production logs "Hydration
 * completed but contains mismatches" and Vue redraws the list. The
 * default design's favourites page did that on every load (#462): it
 * wrapped each `ProductCard`, which renders as an `<li>` unless told
 * otherwise, in an `<li>` of its own.
 *
 * An element renders as a list item when it is an `<li>`, a component
 * given `as="li"`, or a component whose `as` prop defaults to `'li'`
 * (`ProductCard`, `BlogPostCard`, ...) used without one. Its
 * nearest list or list-item ancestor in the same template must be a list:
 * `<ul>`, `<ol>`, `<menu>`, a component given `as="ul"` / `as="ol"`, or a
 * `TransitionGroup` with `tag="ul"` / `tag="ol"`.
 */
const LIST_TAGS = new Set(['ul', 'ol', 'menu'])
/** `as: 'li'` in `withDefaults`, or `as: { ..., default: 'li' }` in `defineProps`. */
const AS_DEFAULTS_TO_LI = /\bas:\s*(?:'li'|\{[^}]*\bdefault:\s*'li')/
/** Components whose default element is `<li>`, by their auto-import name. */
const LIST_ITEM_BY_DEFAULT = new Set(
  [...componentsByName(vueFiles(COMPONENTS))]
    .filter(([, file]) => AS_DEFAULTS_TO_LI.test(sfcScript(file)))
    .map(([name]) => name),
)

function staticProp(node: ElementNode, name: string): string | undefined {
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === name) return prop.value?.content
  }
  return undefined
}

function hasBoundProp(node: ElementNode, name: string): boolean {
  return node.props.some(prop => prop.type === 7 && prop.name === 'bind' && prop.arg !== undefined && 'content' in prop.arg && prop.arg.content === name)
}

/** The element a node renders as, when the template states it; `undefined` when it cannot be told. */
function renderedTag(node: ElementNode): string | undefined {
  if (node.tagType === 0) return node.tag
  if (node.tag === 'TransitionGroup') return staticProp(node, 'tag')
  const as = staticProp(node, 'as')
  if (as) return as
  if (LIST_ITEM_BY_DEFAULT.has(node.tag) && !hasBoundProp(node, 'as')) return 'li'
  return undefined
}

describe('list items are not nested in list items', () => {
  const items: string[] = []
  const nested: string[] = []

  for (const file of vueFiles(APP)) {
    walkElements(sfcTemplate(file), (node, ancestors) => {
      if (renderedTag(node) !== 'li') return
      items.push(`${appLabel(file)}:${node.loc.start.line}`)
      const parent = ancestors.findLast((ancestor) => {
        const tag = renderedTag(ancestor)
        return tag === 'li' || (tag !== undefined && LIST_TAGS.has(tag))
      })
      if (parent && renderedTag(parent) === 'li') {
        nested.push(`${appLabel(file)}:${node.loc.start.line} <${node.tag}> inside <${parent.tag}> (line ${parent.loc.start.line})`)
      }
    })
  }

  it('finds the list items it guards', () => {
    // Canaries: the shop's listings alone render dozens of items, and the
    // cards of both designs default to one.
    expect(items.length).toBeGreaterThan(50)
    expect([...LIST_ITEM_BY_DEFAULT]).toEqual(expect.arrayContaining(['ProductCard', 'BlogPostCard', 'WebsideProductCard']))
  })

  it('renders every list item as an item of a list', () => {
    expect(nested).toEqual([])
  })
})
