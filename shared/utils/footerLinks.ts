import { LEGAL_PAGE_SLUGS } from '~~/shared/utils/legalPages'

export interface FooterLink {
  label: string
  to: string
  /**
   * The ContentPage slug this entry came from, when it came from one.
   *
   * Carried rather than parsed back out of `to`. The slug and the final
   * segment of the URL are equal only for `/info/<slug>`, so the moment
   * a legal page began linking its canonical route (`/terms-of-use`,
   * not `/info/terms`) a URL-derived slug stopped matching
   * `LEGAL_PAGE_SLUGS` and every legal page appeared in the footer
   * twice — once in the operator's own column and once in "Σελίδες".
   */
  slug?: string
}

export interface FooterLinkColumn {
  label: string
  icon?: string
  children: FooterLink[]
}

/**
 * Drop a published legal page from the Pages column when the base
 * columns already link its route.
 *
 * The legal routes render the merchant's own document, so listing the
 * page again puts two footer links to the SAME document under two
 * headings. Suppression is conditional on the base actually carrying
 * the link, never unconditional: an operator-configured footer may omit
 * it, and filtering blindly would remove the only route to a page the
 * law requires to be reachable.
 *
 * Pure so it can be tested without a Nuxt context — the previous
 * version lived inline in the composable and was covered only by
 * source-text assertions, which pass happily while the behaviour is
 * broken.
 */
export function dedupeFooterContentPages(
  base: readonly FooterLinkColumn[],
  children: readonly FooterLink[],
): FooterLink[] {
  const linkedPaths = new Set(
    base.flatMap(column => column.children.map(child => child.to)),
  )

  return children.filter((child) => {
    if (!child.slug || !LEGAL_PAGE_SLUGS.has(child.slug)) return true
    // `to` is already the canonical route for these, so the base either
    // links that exact path or it does not.
    return !linkedPaths.has(child.to)
  })
}
