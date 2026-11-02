import { useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

import type { PublishedTargets } from './builderNavigation'

/** The kinds a link names by id, whose address needs the record's current slug. */
const SLUG_KINDS = ['product', 'category', 'blogPost', 'blogCategory'] as const
type SlugKind = (typeof SLUG_KINDS)[number]

const isSlugKind = (kind: BuilderLinkRef['kind']): kind is SlugKind => (SLUG_KINDS as readonly string[]).includes(kind)

/** The records a document's links name, each once, in the order they are first met. */
export function collectLinkRefs(
  document: BuilderDocument,
  registry: ReadonlyMap<string, BlockDefinition> = builderBlocks,
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

/** What `resolveLinks` needs to turn a record into its address. */
export interface LinkTargets {
  /** Current slug of each product, category, blog post and blog category the page names. */
  slugs: Readonly<Record<SlugKind, ReadonlyMap<number, string>>>
  published: PublishedTargets
}

/**
 * The document with every link setting turned into the path (or URL) it
 * stands for, ready for a section component: a record gives its current
 * address, a fixed route and an external URL themselves. A link to something
 * gone (a record the store no longer has, a page or content page that is not
 * published) is taken out, so the component draws no call to action rather
 * than one that leads nowhere.
 */
export function resolveLinks(
  document: BuilderDocument,
  targets: LinkTargets,
  registry: ReadonlyMap<string, BlockDefinition> = builderBlocks,
): BuilderDocument {
  const address = (link: unknown): string | typeof REMOVE_LINK => {
    if (!isBuilderLink(link)) return REMOVE_LINK
    if ('href' in link) return link.href
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
  const sections = { ...document.sections }
  for (const [id, node] of Object.entries(document.sections)) {
    sections[id] = mapNode(node, registry, address)
  }
  return { ...document, sections }
}

/**
 * Everything `resolveLinks` needs for `refs`, and nothing more: the slugs of
 * the records named by id (one call to Django), and the published pages only
 * when a link names a page or a content page. A read that fails fails the
 * page, which is then not cached, instead of answering links that hide
 * what is merely unreadable.
 */
export async function readLinkTargets(event: RequestEvent, refs: readonly BuilderLinkRef[]): Promise<LinkTargets> {
  const namesPublished = refs.some(({ kind }) => kind === 'page' || kind === 'contentPage')
  return {
    slugs: await readLinkSlugs(event, refs),
    published: namesPublished
      ? await publishedTargets(event, await readPublishedSummary(event))
      : { pages: new Set(), contentPages: new Set() },
  }
}

/**
 * The slugs of the records `refs` name, in ONE call to Django
 * (`GET builder/link-targets`); no call at all when no link names a record by
 * id. A slug does not vary by language, so the call carries none. Django
 * answers at most `LINK_TARGETS_MAX_IDS` ids of a kind, so a page naming more
 * makes one call per that many. A record Django does not know is simply absent.
 */
async function readLinkSlugs(
  event: RequestEvent,
  refs: readonly BuilderLinkRef[],
): Promise<LinkTargets['slugs']> {
  const wanted: Record<SlugKind, number[]> = { product: [], category: [], blogPost: [], blogCategory: [] }
  for (const { kind, id } of refs) {
    if (isSlugKind(kind) && typeof id === 'number') wanted[kind].push(id)
  }
  const calls = Math.max(...SLUG_KINDS.map(kind => Math.ceil(wanted[kind].length / LINK_TARGETS_MAX_IDS)))
  const answers = await Promise.all(Array.from({ length: calls }, async (_, call) => {
    const from = call * LINK_TARGETS_MAX_IDS
    const query = Object.fromEntries(SLUG_KINDS.flatMap((kind) => {
      const ids = wanted[kind].slice(from, from + LINK_TARGETS_MAX_IDS)
      return ids.length ? [[kind, ids.join(',')]] : []
    }))
    return parseDataAs(
      await useBackendFetch(event)(`${useRuntimeConfig().apiBaseUrl}/builder/link-targets`, { method: 'GET', query }),
      ZodBuilderLinkTargets,
    )
  }))
  const slugsOf = (kind: SlugKind): ReadonlyMap<number, string> =>
    new Map(answers.flatMap(answer => Object.entries(answer[kind] ?? {}).map(([id, slug]) => [Number(id), slug] as const)))
  return { product: slugsOf('product'), category: slugsOf('category'), blogPost: slugsOf('blogPost'), blogCategory: slugsOf('blogCategory') }
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
