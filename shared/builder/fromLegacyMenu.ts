import type { BuilderNode } from '../types/builder'
import { checkSettings, LegacyConvertError, put } from './fromLegacy'
import type { BuilderOverlay, ConvertedLayout, LegacyError, Registry } from './fromLegacy'
import { formatVersionedType } from './upgrade'

/**
 * The import of a navigation menu into a group document, with the same
 * contract as a layout (`convertLegacyLayout`): the menu is one section
 * (`header_menu`, `mobile_menu` or `footer_menu`), a footer column a child
 * block and a link a child of that. Pure.
 *
 * A link's label is the effective one Django resolved per language (a page
 * link without its own label takes the page's title), strict per language:
 * the default language's is the setting, the others' the overlay. A link
 * names its target by what it points at, one of four.
 */

export interface LegacyMenuLink {
  /** `NavigationLink.uuid`: the node's id; without one `<parent id>-<n>`. */
  id?: string
  labels: Record<string, string>
  icon?: string
  target:
    | { type: 'content_page', slug: string }
    | { type: 'page_layout', pageType: string }
    | { type: 'route', route: string }
    | { type: 'url', href: string }
}

export interface LegacyMenuColumn {
  id?: string
  labels: Record<string, string>
  icon?: string
  showsMerchantIdentity?: boolean
  links: readonly LegacyMenuLink[]
}

export interface LegacyMenu {
  /** `NavigationMenu.uuid`: the section's id; without one `<slot>_menu`. */
  id?: string
  slot: 'header' | 'footer' | 'mobile'
  /** The footer's columns. */
  columns?: readonly LegacyMenuColumn[]
  /** The header's or the mobile menu's links. */
  links?: readonly LegacyMenuLink[]
}

function targetSettings(target: LegacyMenuLink['target']): Record<string, string> {
  switch (target.type) {
    case 'content_page': return { contentPage: target.slug }
    case 'page_layout': return { page: target.pageType }
    case 'route': return { route: target.route }
    case 'url': return { href: target.href }
    default: return {}
  }
}

/** The label of each language: the default's as the setting, the others' (when not empty) to the overlay. */
function labelled(overlay: BuilderOverlay, id: string, labels: Record<string, string>, defaultLocale: string): string {
  for (const locale of Object.keys(labels).sort()) {
    if (locale !== defaultLocale && labels[locale]) put(overlay, locale, id, '/label', labels[locale])
  }
  return labels[defaultLocale] ?? ''
}

export function convertLegacyMenu(
  menu: LegacyMenu,
  options: { defaultLocale: string, registry: Registry },
): ConvertedLayout {
  const { registry, defaultLocale } = options
  const overlay: BuilderOverlay = {}
  const sectionId = menu.id ?? `${menu.slot}_menu`
  const type = `${menu.slot}_menu`
  const definition = registry.get(type)
  if (!definition) {
    throw new LegacyConvertError([{ path: `/sections/${sectionId}`, code: 'unknown_block_type', message: `"${type}" is not a section the storefront has a block for` }])
  }
  const link = (source: LegacyMenuLink, id: string): BuilderNode => ({
    type: formatVersionedType('nav_link', 1),
    settings: {
      label: labelled(overlay, id, source.labels, defaultLocale),
      ...(source.icon && { icon: source.icon }),
      ...targetSettings(source.target),
    },
  })
  const children = (items: readonly LegacyMenuLink[], parentId: string, into: BuilderNode) => {
    const blocks: Record<string, BuilderNode> = {}
    const blockOrder: string[] = []
    items.forEach((item, index) => {
      const id = item.id ?? `${parentId}-${index + 1}`
      blocks[id] = link(item, id)
      blockOrder.push(id)
    })
    if (blockOrder.length > 0) Object.assign(into, { blocks, blockOrder })
  }

  const section: BuilderNode = { type: formatVersionedType(definition.type, definition.version), settings: {} }
  if (menu.slot === 'footer') {
    const blocks: Record<string, BuilderNode> = {}
    const blockOrder: string[] = []
    ;(menu.columns ?? []).forEach((column, index) => {
      const id = column.id ?? `${sectionId}-${index + 1}`
      const node: BuilderNode = {
        type: formatVersionedType('footer_column', 1),
        settings: {
          label: labelled(overlay, id, column.labels, defaultLocale),
          ...(column.icon && { icon: column.icon }),
          ...(column.showsMerchantIdentity && { showsMerchantIdentity: true }),
        },
      }
      children(column.links, id, node)
      blocks[id] = node
      blockOrder.push(id)
    })
    if (blockOrder.length > 0) Object.assign(section, { blocks, blockOrder })
  }
  else {
    children(menu.links ?? [], sectionId, section)
  }

  const errors: LegacyError[] = []
  checkSettings(registry, section, `/sections/${sectionId}`, errors)
  if (errors.length > 0) throw new LegacyConvertError(errors)
  const i18n = Object.fromEntries(Object.keys(overlay).sort().map(locale => [locale, overlay[locale]!]))
  return { document: { sections: { [sectionId]: section }, order: [sectionId] }, i18n, warnings: [] }
}
