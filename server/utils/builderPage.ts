import type { RequestEvent } from 'nuxt/server'

/**
 * A page document as Django resolved it for one language (a published
 * page, or the editor's working copy in its place), made safe to keep: every
 * node brought to its block's current version, validated and rebuilt
 * (`parseDocument`, an unusable node left out with a warning). What it holds
 * is the page's own content: data settings still stored as ids and
 * descriptors, links still stored as where they go. That is why it can be
 * cached for minutes (`readPublishedPage`): nothing in it goes stale when a
 * product is renamed or repriced.
 */
export function parseBuilderPage(featureOn: (feature: StoreFeatureName) => boolean, raw: unknown): BuilderDocument {
  return parseDocument(raw, 'page', builderBlocks, { featureOn, onSkip: logSkippedNode })
}

/**
 * A parsed page made ready to render, as of now: its data settings read and
 * applied (`resolveBuilderData`: a product rail becomes the products it
 * lists, a missing record the status its component draws), its links answered
 * as the addresses they have now (`resolveLinks`), each section as its block
 * type and its component's props (`sectionProps`).
 *
 * The published page and the editor's preview of it go through this one
 * function, so the preview draws what a release will. `keepHidden` is the
 * editor canvas, which keeps a node the page would leave out so the merchant
 * can see why it is empty.
 */
export async function renderBuilderPage(
  event: RequestEvent,
  parsed: BuilderDocument,
  { keepHidden = false }: { keepHidden?: boolean } = {},
): Promise<BuilderPage> {
  const { document: withData } = await resolveBuilderData(event, parsed, { keepHidden })
  const document = resolveLinks(withData, await readLinkTargets(event, collectLinkRefs(withData, builderBlocks)), builderBlocks)
  return {
    ...(document.settings && { settings: document.settings }),
    sections: document.order.map((id) => {
      const node = document.sections[id]!
      return { id, componentType: parseVersionedType(node.type)!.type, props: sectionProps(node, builderBlocks) }
    }),
  }
}

/** A page document of Django, parsed and rendered in one go: the editor's preview and a share link, whose document is not cached. */
export async function builderPageOf(event: RequestEvent, raw: unknown, options: { keepHidden?: boolean } = {}): Promise<BuilderPage> {
  return renderBuilderPage(event, parseBuilderPage(storeFeatureOf(event), raw), options)
}

/**
 * The store's menus from its section group documents, by group name
 * (`header`, `mobile`, `footer`), as the links and columns `useNavigation`
 * reads (`navigationItems`). A link to a page or a content page `targets`
 * does not hold is hidden. The published menus and the editor's preview of
 * them go through this one function.
 */
export function builderNavigationOf(event: RequestEvent, groups: Readonly<Record<string, unknown>>, targets: PublishedTargets): NavigationItems {
  const featureOn = storeFeatureOf(event)
  return Object.assign({}, ...Object.values(groups).map(group =>
    navigationItems(parseDocument(group, 'group', builderBlocks, { featureOn, onSkip: logSkippedNode }), targets, builderBlocks)))
}

/**
 * Whether a store feature is on for the store of the request: a block that
 * needs one that is off is left out of what the store draws (`parseDocument`),
 * with a warning, so turning a feature off never leaves a dead section on a
 * live page.
 */
export function storeFeatureOf(event: RequestEvent): (feature: StoreFeatureName) => boolean {
  return feature => eventStoreFeature(event, feature)
}
