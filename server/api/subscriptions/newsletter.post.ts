import { newsletterConsentText } from '~~/shared/i18n/newsletterConsent'

/**
 * The newsletter band's form: subscribe an address to the store's
 * default newsletter topic (double opt-in — Django emails the link).
 *
 * The browser sends the address and the ticked box; the consent
 * SENTENCE is added here, in the request's locale, from the same
 * module the form label renders (`shared/i18n/newsletterConsent.ts`) —
 * a consent record the client composed would be only as trustworthy as
 * the client. The client calls this
 * route with `?locale=` set to the locale it rendered the label in, so
 * `1.locale.ts` resolves the same one and the stored sentence is the
 * one that was on screen.
 *
 * `createHeaders()`: Django records the visitor's IP and user agent as
 * part of the consent, and keys its per-caller throttle on the IP — both
 * need the client-identity headers, not this pod's.
 *
 * Django answers 202 for every accepted address (it never says whether
 * one is known). Its 400/404/429 bodies are RETURNED with their status
 * (`forwardUpstreamClientError`), as the contact form does, so the band
 * can say what went wrong.
 */
const zNewsletterFormBody = zSubscribeToNewsletterBody.omit({ consentText: true })

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zNewsletterFormBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/subscription/newsletter`, {
      method: 'POST',
      headers: createHeaders(),
      body: {
        ...body,
        consentText: newsletterConsentText(requestLocale(event)),
      },
    })
    return await parseDataAs(response, zSubscribeToNewsletterResponse)
  }
  catch (error) {
    return forwardUpstreamClientError(error)
  }
})
