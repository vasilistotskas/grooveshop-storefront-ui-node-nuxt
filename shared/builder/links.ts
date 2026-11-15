import { LINK_SLUG_KINDS } from '../constants/builder'
import type { BlockDefinition, BuilderDocument, BuilderLink, BuilderLinkRef, BuilderNode, LinkSlugKind, LinkTargets } from '../types/builder'
import { blogCategoryPath, blogPostPath, categoryPath, contentPagePath, pagePath, productPath } from '../utils/entityPaths'
import { isFeaturePathBlocked } from '../utils/gatedRoutes'
import { mapLinkSettings, REMOVE_LINK } from './linkSettings'
import { parseVersionedType } from './upgrade'

/** Whether a link names a record whose address needs its current slug. */
export const isLinkSlugKind = (kind: BuilderLinkRef['kind']): kind is LinkSlugKind => (LINK_SLUG_KINDS as readonly string[]).includes(kind)

/** The records a document's links name, each once, in the order they are first met. */
export function collectLinkRefs(
  document: BuilderDocument,
  registry: ReadonlyMap<string, BlockDefinition>,
): BuilderLinkRef[] {
  const found = new Map<string, BuilderLinkRef>()
  forEachNode(document, registry, (node, definition) => {
    mapLinkSettings(node.settings, definition.linkRefs, (link) => {
      if (isLinkRef(link)) found.set(`${link.ref.kind}:${link.ref.id}`, link.ref)
      return link
    })
  })
  return [...found.values()]
}

/** A record's address, or `REMOVE_LINK` when the record is not there (it has no slug). */
const withSlug = (slug: string | undefined, path: (slug: string) => string): string | typeof REMOVE_LINK =>
  slug === undefined ? REMOVE_LINK : path(slug)

/**
 * The document with every link setting turned into the path (or URL) it
 * stands for, ready for a section component: a record gives its current
 * address, a fixed route and an external URL themselves. A link to something
 * gone (a record the store no longer has, a page or content page that is not
 * published) is taken out, so the component draws no call to action rather
 * than one that leads nowhere. So is a link to a page a switched-off store
 * feature takes away (`targets.blocked`, the gated routes' one table): `/blog`
 * with the blog off, a product with the catalogue off, which would be a 404.
 */
export function resolveLinks(
  document: BuilderDocument,
  targets: LinkTargets,
  registry: ReadonlyMap<string, BlockDefinition>,
): BuilderDocument {
  // The store path a link stands for, before the gate: every one of them
  // goes through it (a published page can be `/blog` itself).
  const storePath = (link: Exclude<BuilderLink, { href: string }>): string | typeof REMOVE_LINK => {
    if ('route' in link) return link.route
    const { ref } = link
    switch (ref.kind) {
      case 'page': return targets.published.pages.has(ref.id) ? pagePath(ref.id) : REMOVE_LINK
      case 'contentPage': return targets.published.contentPages.has(ref.id) ? contentPagePath(ref.id) : REMOVE_LINK
      case 'product': return withSlug(targets.slugs.product.get(ref.id), slug => productPath(ref.id, slug))
      case 'category': return withSlug(targets.slugs.category.get(ref.id), slug => categoryPath(ref.id, slug))
      case 'blogPost': return withSlug(targets.slugs.blogPost.get(ref.id), slug => blogPostPath(ref.id, slug))
      case 'blogCategory': return withSlug(targets.slugs.blogCategory.get(ref.id), slug => blogCategoryPath(ref.id, slug))
    }
  }
  const address = (link: unknown): string | typeof REMOVE_LINK => {
    if (!isBuilderLink(link)) return REMOVE_LINK
    // Someone else's page: no feature of this store gates it.
    if ('href' in link) return link.href
    const path = storePath(link)
    return path !== REMOVE_LINK && isFeaturePathBlocked(path, targets.blocked) ? REMOVE_LINK : path
  }
  const sections = { ...document.sections }
  for (const [id, node] of Object.entries(document.sections)) {
    sections[id] = mapNode(node, registry, address)
  }
  return { ...document, sections }
}

function forEachNode(
  document: BuilderDocument,
  registry: ReadonlyMap<string, BlockDefinition>,
  visit: (node: BuilderNode, definition: BlockDefinition) => void,
): void {
  const walk = (node: BuilderNode): void => {
    const definition = registry.get(parseVersionedType(node.type)?.type ?? '')
    if (definition) visit(node, definition)
    for (const child of Object.values(node.blocks ?? {})) walk(child)
  }
  for (const node of Object.values(document.sections)) walk(node)
}

function mapNode(
  node: BuilderNode,
  registry: ReadonlyMap<string, BlockDefinition>,
  address: (link: unknown) => string | typeof REMOVE_LINK,
): BuilderNode {
  const definition = registry.get(parseVersionedType(node.type)?.type ?? '')
  return {
    ...node,
    settings: definition ? mapLinkSettings(node.settings, definition.linkRefs, address) : node.settings,
    ...(node.blocks && {
      blocks: Object.fromEntries(Object.entries(node.blocks).map(([id, child]) => [id, mapNode(child, registry, address)])),
    }),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isLinkRef = (link: unknown): link is { ref: BuilderLinkRef } => isRecord(link) && isRecord(link.ref)

const isBuilderLink = (link: unknown): link is BuilderLink => isRecord(link) && ('href' in link || 'route' in link || 'ref' in link)
