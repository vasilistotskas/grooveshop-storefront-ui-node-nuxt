/**
 * Whether the newsletter band can offer its form: true when the store
 * has a default newsletter topic for a submission to land in.
 *
 * Cached per tenant — the answer is store configuration, never
 * per-visitor — with a short window so a topic the merchant just
 * created shows the form within a minute. Django 404s the endpoint
 * while NEWSLETTER_ENABLED is off; the band checks that flag first and
 * does not ask.
 */
export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    // useBackendFetch: the answer is per tenant, so Django must see
    // X-Forwarded-Host — including on an SWR revalidation.
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/user/subscription/newsletter`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zGetNewsletterAvailabilityResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'NewsletterAvailability',
  maxAge: 60,
  staleMaxAge: 60 * 10,
  swr: true,
  getKey: event => tenantCacheKey(event, 'newsletter:availability'),
})
