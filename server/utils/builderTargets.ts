import { createError, useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import type * as z from 'zod'

/** The current release in outline: its section groups and the pages it holds (`GET builder/published`). */
export async function readPublishedSummary(event: RequestEvent): Promise<z.output<typeof ZodBuilderPublishedSummary>> {
  return parseDataAs(
    await useBackendFetch(event)(`${useRuntimeConfig().apiBaseUrl}/builder/published`, {
      method: 'GET',
      query: { locale: requestLocale(event) },
    }),
    ZodBuilderPublishedSummary,
  )
}

/**
 * What the store has published: the page types of `summary` and the slugs of
 * its published content pages, which a menu link or a link of a page may
 * point at. A content page list that cannot be read is an error, never an
 * empty answer: that would hide the wrong links, and a failure is not cached.
 */
export async function publishedTargets(
  event: RequestEvent,
  summary: z.output<typeof ZodBuilderPublishedSummary>,
): Promise<PublishedTargets> {
  const contentPages = await publishedContentLocalesForHost(requestTenantHost(event), useRuntimeConfig().apiBaseUrl)
  if (!contentPages) {
    throw createError({ status: 502, statusText: 'The published content pages could not be read' })
  }
  return {
    pages: new Set(summary.pages.map(({ key }) => key)),
    contentPages: new Set(contentPages.keys()),
  }
}
