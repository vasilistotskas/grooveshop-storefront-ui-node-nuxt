import { getQuery } from 'h3'
import { getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * Whether the newsletter band can offer its form: true when the store
 * has a default newsletter topic for a submission to land in, or, for a
 * band that names one, when that topic is still on offer.
 *
 * Cached per tenant — the answer is store configuration, never
 * per-visitor — with a short window so a topic the merchant just
 * created shows the form within a minute. Django 404s the endpoint
 * while NEWSLETTER_ENABLED is off; the band checks that flag first and
 * does not ask.
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zGetNewsletterAvailabilityQuery)
    // useBackendFetch: the answer is per tenant, so Django must see
    // X-Forwarded-Host — including on an SWR revalidation.
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/user/subscription/newsletter`,
      { method: 'GET', query },
    )
    return await parseDataAs(response, zGetNewsletterAvailabilityResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'NewsletterAvailability',
  maxAge: 60,
  staleMaxAge: 60 * 10,
  swr: true,
  // Only digits reach the key: anything else is refused above, and an unbounded key is not left to the caller.
  getKey: (event) => {
    const { topic } = getQuery(event)
    return tenantCacheKey(event, typeof topic === 'string' && /^\d+$/.test(topic) ? `newsletter:availability:${topic}` : 'newsletter:availability')
  },
})
