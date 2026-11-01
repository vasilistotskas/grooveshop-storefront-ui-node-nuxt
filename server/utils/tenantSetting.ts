/*
 * Readers for Nitro routes that have no tenant context of their own.
 *
 * The sitemap and feed routes are bypassed in
 * `server/middleware/0.tenant.ts` (@nuxtjs/sitemap hits them at
 * build/SWR time with no real Host), so they resolve the tenant
 * themselves and cannot use the request-scoped readers — hence the
 * explicit `host`, forwarded as `X-Forwarded-Host` (`backendFetchFor`)
 * so Django resolves the right schema instead of answering from the
 * public one. Feature and preference gates need no read here: they are
 * in the tenant payload those routes already resolve.
 *
 * They fail CLOSED: a feed that fails open PUBLISHES a URL the page's
 * own gate then 404s, the defect these callers exist to prevent. `null`
 * is the closed signal.
 */

/**
 * Every page this tenant's current release has PUBLISHED (a template of a
 * static route or a custom page), with when it last changed (Django
 * `GET builder/published`).
 *
 * Two sitemap callers read it: the source lists the store's custom pages
 * (every published page no static route renders, at `/<key>`), and the
 * tenant gate drops the page-backed static routes whose page the store has
 * not published, which answer 404. One read for both, where the gate used
 * to ask Django once per page type.
 *
 * Fails CLOSED (see the top of this file): `null` when the read fails
 * or the answer is not the contract, so neither caller lists a
 * page it could not confirm. Unlike a route, nothing downstream reports
 * the failure, so it is logged here: a drifted contract is our defect.
 */
export async function publishedPagesForHost(
  host: string,
  apiBaseUrl: string,
): Promise<readonly PublishedPage[] | null> {
  try {
    const { pages } = await parseDataAs(
      backendFetchFor({ tenantHost: host })(`${apiBaseUrl}/builder/published`, {
        method: 'GET',
      }),
      ZodBuilderPublishedSummary,
    )
    return pages
  }
  catch (error) {
    log.warn({
      tag: 'sitemap',
      message: 'Published pages unreadable; no custom page or brand page is listed',
      host,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Every PUBLISHED ContentPage slug this tenant has, and the locales it
 * exists in.
 *
 * Which legal documents a store actually has is per-tenant data, and no
 * build-time list can answer it: `/terms-of-use` and friends are static
 * routes that exist for every tenant, but they render the tenant's own
 * ContentPage and answer 404 when there is none. Three of the four
 * production tenants have no `return-policy` page.
 *
 * The LOCALES matter for the same reason one layer down. A page is
 * translated per locale, and on a locale it is not written in the legal
 * route renders it in the language it exists in with a canonical
 * pointing at THAT locale's URL — so `/en/terms-of-use` on a store with
 * a Greek-only document is a non-canonical duplicate, and a sitemap lists
 * canonical URLs only. The row's `translatedLocales` are exactly the
 * locales that are canonical.
 *
 * The API returns only published rows to an anonymous caller, so
 * membership here is exactly "this route resolves for this tenant, in
 * this locale". `pageSize` is explicit because the endpoint's default
 * page is 12.
 *
 * Fails CLOSED (see the top of this file). `null` is the closed signal.
 */
export async function publishedContentLocalesForHost(
  host: string,
  apiBaseUrl: string,
): Promise<ReadonlyMap<string, ReadonlySet<string>> | null> {
  try {
    const { results } = await backendFetchFor({ tenantHost: host })<{
      results: Pick<ContentPage, 'slug' | 'translatedLocales'>[]
    }>(
      `${apiBaseUrl}/content-page`,
      {
        method: 'GET',
        query: { pageSize: 100 },
      },
    )
    // Written locales only (Django names them: a list carries no body, and
    // a key with an empty body is no document), and no entry for a page
    // written in none: it 404s, so its route must not be listed.
    return new Map(
      results.flatMap(page =>
        page.translatedLocales.length ? [[page.slug, new Set(page.translatedLocales)] as const] : [],
      ),
    )
  }
  catch {
    return null
  }
}
