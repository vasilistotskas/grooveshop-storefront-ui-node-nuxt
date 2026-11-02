import type { RequestEvent } from 'nuxt/server'

/**
 * A page document, as Django resolved it for one language (a published
 * page, or the editor's working copy in its place), made ready to render: every node brought to its block's current version,
 * validated and rebuilt (`parseDocument`, an unusable node left out with a
 * warning), its links answered as the addresses they have now
 * (`resolveLinks`), each section as its block type and its component's props
 * (`sectionProps`). The published page and the editor's preview of it go
 * through this one function, so the preview draws what a release will.
 */
export async function builderPageOf(event: RequestEvent, raw: unknown): Promise<BuilderPage> {
  const parsed = parseDocument(raw, 'page', builderBlocks, { onSkip: logSkippedNode })
  const document = resolveLinks(parsed, await readLinkTargets(event, collectLinkRefs(parsed, builderBlocks)), builderBlocks)
  return {
    ...(document.settings && { settings: document.settings }),
    sections: document.order.map((id) => {
      const node = document.sections[id]!
      return { id, componentType: parseVersionedType(node.type)!.type, props: sectionProps(node, builderBlocks) }
    }),
  }
}

/**
 * The store's menus from its section group documents, by group name
 * (`header`, `mobile`, `footer`), as the links and columns `useNavigation`
 * reads (`navigationItems`). A link to a page or a content page `targets`
 * does not hold is hidden. The published menus and the editor's preview of
 * them go through this one function.
 */
export function builderNavigationOf(groups: Readonly<Record<string, unknown>>, targets: PublishedTargets): NavigationItems {
  return Object.assign({}, ...Object.values(groups).map(group =>
    navigationItems(parseDocument(group, 'group', builderBlocks, { onSkip: logSkippedNode }), targets, builderBlocks)))
}
