/**
 * The storefront body that draws each page type with a route of its own
 * (`STATIC_LAYOUT_ROUTES`), so a share-preview link shows a page in the very
 * component the store serves it with, in the store's design. `blog-post` is
 * the bands under every article; the editor's preview draws it on the blog
 * index, and so does a share link. Typed on the page types, so a new static
 * page type cannot be added without saying how a link draws it.
 */
const SHARE_BODIES = {
  'home': 'home',
  'products': 'products',
  'blog': 'blog',
  'blog-post': 'blog',
  'contact': 'contact',
  'feedback': 'feedback',
  'about': 'brand-page',
  'vision': 'brand-page',
  'what-is-microlearning': 'brand-page',
  'why-microlearning': 'brand-page',
} as const satisfies Record<StaticLayoutPageType, PageKey>

/**
 * The body a share link draws the page `page` with, and the props it takes:
 * the page type's own body, or the custom page body for a page the store
 * made.
 */
export function builderShareBody(page: string): { key: PageKey, props: Record<string, string> } {
  if (!isStaticLayoutPageType(page)) return { key: 'custom-page', props: { slug: page } }
  const key = SHARE_BODIES[page]
  return { key, props: key === 'brand-page' ? { pageType: page } : {} }
}
