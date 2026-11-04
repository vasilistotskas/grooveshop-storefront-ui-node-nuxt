import { createError, useRuntimeConfig } from 'nuxt/server'

/**
 * The current release in outline: its section groups and the pages it holds
 * (`GET builder/published`), for the store and language named. The reads of
 * the release take the store and language rather than a request, so a cached
 * function can make them (a page's links are resolved from one).
 */
export async function readPublishedSummary(tenantHost: string, locale: string): Promise<PublishedIndex> {
  return parseDataAs(
    await backendFetchFor({ tenantHost, locale })(`${useRuntimeConfig().apiBaseUrl}/builder/published`, {
      method: 'GET',
      query: { locale },
    }),
    zBuilderPublishedIndexResponse,
  )
}

/**
 * What the store has published: the page types of `summary` and the slugs of
 * its published content pages, which a menu link or a link of a page may
 * point at. A content page list that cannot be read is an error, never an
 * empty answer: that would hide the wrong links, and a failure is not cached.
 */
export async function publishedTargets(
  tenantHost: string,
  summary: PublishedIndex,
): Promise<PublishedTargets> {
  const contentPages = await publishedContentLocalesForHost(tenantHost, useRuntimeConfig().apiBaseUrl)
  if (!contentPages) {
    throw createError({ status: 502, statusText: 'The published content pages could not be read' })
  }
  return {
    pages: new Set(summary.pages.map(({ key }) => key)),
    contentPages: new Set(contentPages.keys()),
  }
}
