import { splitLocale } from '~~/shared/i18n/localeFromPath'

export interface FooterLink {
  label: string
  to: string
}

export interface FooterLinkColumn {
  label: string
  icon?: string
  children: FooterLink[]
}

/**
 * Drop a ContentPage from the Pages column when the base columns
 * already link its route.
 *
 * One destination, one footer link. Two entries pointing at the same
 * path are the same page under two headings, and the operator's own
 * column is the one that survives: it is the label and the placement
 * they chose, where "Σελίδες" is a generated catch-all.
 *
 * Suppression is conditional on the base actually carrying the link,
 * never unconditional — an operator-configured footer may omit a page
 * entirely, and filtering blindly would remove the only route to a
 * document the law requires to be reachable. That condition is the
 * whole guard, which is why this no longer special-cases the legal
 * slugs: restricting it to them left `/info/faq` and
 * `/info/shipping-info` listed twice in demo's footer, once in the
 * operator's "Εξυπηρέτηση" column and once in "Σελίδες".
 *
 * Paths are compared with the locale prefix stripped. The base carries
 * `NavigationMenu` rows verbatim from Django while the Pages column is
 * built with `localePath()`, so on a tenant serving a second locale
 * `/terms-of-use` and `/en/terms-of-use` are the same destination
 * spelled two ways, and a raw string comparison silently stops
 * deduplicating the moment a store enables `en`.
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
  const linkedRoutes = new Set(
    base.flatMap(column =>
      column.children.map(child => splitLocale(child.to).route),
    ),
  )

  return children.filter(
    child => !linkedRoutes.has(splitLocale(child.to).route),
  )
}
