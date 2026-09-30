/**
 * Top-level paths the catch-all `/[slug]` page must never claim. The
 * static routes behind them always win route matching; this keeps the
 * catch-all from answering for them if that ever changes.
 */
const RESERVED_SLUGS: ReadonlySet<string> = new Set(['api', 'account', 'products', 'blog', 'cart', 'checkout', 'search'])

/**
 * Whether the catch-all `/[slug]` page may render `slug`: a plain
 * lowercase-kebab segment that is not a reserved top-level path. Used
 * as that page's `definePageMeta` `validate`, so anything else is a 404
 * before the page asks for a layout.
 */
export function isCustomPageSlug(slug: unknown): boolean {
  return typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug) && !RESERVED_SLUGS.has(slug)
}
