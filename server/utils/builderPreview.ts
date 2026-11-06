import type { RequestEvent } from 'nuxt/server'

/**
 * A page Django resolved as if some drafts were released (`builder/preview/
 * resolve`, or a share link's frozen drafts), made ready for the canvas seam
 * (`useBuilderCanvasPreview`): the page through the published pipeline
 * (`builderPageOf`) and the store's menus from the groups
 * (`builderNavigationOf`), so a preview draws what publishing would serve.
 * Links follow the published store: a link to a page that is not published is
 * hidden, as it would be until that page is. What the menus may link to does
 * not depend on the drafts, so it is read while Django resolves them.
 *
 * The editor's preview and a share link both answer through this one function.
 * The editor's keeps (`keepHidden`) a node the page would leave out for lack
 * of data, so the merchant sees why it is empty; a share link shows what
 * visitors will see.
 */
export async function builderPreviewOf(
  event: RequestEvent,
  documentKey: string,
  resolving: Promise<Pick<PublishedPage, 'page' | 'groups'>>,
  options: BuilderReadOptions = {},
): Promise<BuilderPreviewResponse> {
  const tenantHost = requestTenantHost(event)
  const [resolved, targets] = await Promise.all([
    resolving,
    readPublishedSummary(tenantHost, requestLocale(event)).then(summary => publishedTargets(tenantHost, summary)),
  ])
  const page = await builderPageOf(event, resolved.page, options)
  const navigation = builderNavigationOf(event, resolved.groups, targets)
  return { pages: { [documentKey]: page }, navigation }
}
