/** What the store has published: the pages and content pages a menu link may point at. */
export interface NavigationTargets {
  /** Page types of the pages in the current release. */
  pages: ReadonlySet<string>
  /** Slugs of the published content pages. */
  contentPages: ReadonlySet<string>
}

const MENU_SLOTS: Record<string, keyof NavigationItems> = {
  header_menu: 'header',
  mobile_menu: 'mobile',
  footer_menu: 'footer',
}

/** The props `sectionProps` gives a nav link (its settings, already parsed against the block's schema). */
interface LinkProps {
  label: string
  icon?: string
  page?: string
  contentPage?: string
  route?: string
  href?: string
}

interface ColumnProps {
  label: string
  icon?: string
  showsMerchantIdentity?: boolean
  children?: LinkProps[]
}

/**
 * A link as the chrome renders it, or `undefined` when it must be hidden: a
 * link to a page or a content page that is not published is an advertised 404,
 * so it is left out exactly as Django's read-time omission left it out.
 * A content page resolves through the legal routes (`LEGAL_ROUTE_BY_SLUG`)
 * rather than always to `/info/<slug>`, which would 301 to them.
 */
function visibleLink(link: LinkProps, targets: NavigationTargets): NavLink | undefined {
  const icon = link.icon ? { icon: link.icon } : {}
  if (link.page !== undefined) {
    // A page type a static route renders is served at that route (`home` at `/`, not `/home`, which only redirects).
    const to = isStaticLayoutPageType(link.page) ? STATIC_LAYOUT_ROUTES[link.page].path : `/${link.page}`
    return targets.pages.has(link.page) ? { label: link.label, to, ...icon } : undefined
  }
  if (link.contentPage !== undefined) {
    return targets.contentPages.has(link.contentPage)
      ? { label: link.label, to: LEGAL_ROUTE_BY_SLUG.get(link.contentPage) ?? `/info/${link.contentPage}`, ...icon }
      : undefined
  }
  if (link.route !== undefined) return { label: link.label, to: link.route, ...icon }
  if (link.href !== undefined) return { label: link.label, href: link.href, ...icon }
  return undefined
}

/**
 * The menus of a parsed group document in the shape the chrome reads
 * (`useNavigation`): `[{ label, to | href, icon? }]` for the header and the
 * mobile menu, `[{ label, icon?, showsMerchantIdentity?, children }]` for the
 * footer. A hidden link is dropped, and a footer column left with no visible
 * link goes with them: a bare heading is noise. A disabled menu is not there.
 */
export function navigationItems(
  document: BuilderDocument,
  targets: NavigationTargets,
  registry: ReadonlyMap<string, BlockDefinition> = builderBlocks,
): NavigationItems {
  const items: NavigationItems = {}
  for (const id of document.order) {
    const node = document.sections[id]
    const slot = node && !node.disabled ? MENU_SLOTS[parseVersionedType(node.type)?.type ?? ''] : undefined
    if (!node || !slot) continue
    // Parsed props: the blocks' own schemas have already vouched for these shapes.
    const props = sectionProps(node, registry) as { links?: LinkProps[], columns?: ColumnProps[] }
    if (slot === 'footer') {
      items.footer = (props.columns ?? []).flatMap((column) => {
        const children = (column.children ?? []).flatMap(link => visibleLink(link, targets) ?? [])
        return children.length > 0
          ? [{
              label: column.label,
              ...(column.icon && { icon: column.icon }),
              ...(column.showsMerchantIdentity && { showsMerchantIdentity: true }),
              children,
            }]
          : []
      })
    }
    else {
      items[slot] = (props.links ?? []).flatMap(link => visibleLink(link, targets) ?? [])
    }
  }
  return items
}
