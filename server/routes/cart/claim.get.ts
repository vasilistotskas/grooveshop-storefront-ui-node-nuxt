import * as z from 'zod'
import { defineEventHandler, getQuery, getValidatedQuery, sendRedirect } from 'nuxt/server'
import { localizedPath } from '~~/shared/i18n/localeFromPath'
import { servedLocale } from '~~/shared/i18n/tenantLocales'

// Agent-built carts (grooveshop-agent-gateway) hand the shopper a link of
// the form `/cart/claim?uuid=<cart-uuid>` once they're ready to check out,
// plus `locale=<code>` when the conversation was not in the storefront's
// default locale. This route adopts that guest cart into the browser
// session (`claimCart`) then sends the shopper to the cart page, in that
// language, to finish checkout normally.
//
// Any failure (malformed uuid, unknown/expired cart) redirects to the cart
// page WITHOUT touching the existing session, so a bad or replayed claim
// link can never clobber a shopper's real cart.
const zCartClaimQuery = z.object({
  uuid: z.uuid(),
})

export default defineEventHandler(async (event) => {
  // A server route has no path prefix, so the language comes with the
  // link; one the store does not serve lands on the default locale's page.
  const { locale } = getQuery(event)
  const cartPage = localizedPath(
    servedLocale(typeof locale === 'string' ? locale : undefined, event.context.tenant),
    '/cart',
  )

  // A store without the cart has nothing to adopt a cart into.
  if (!eventStoreFeature(event, 'cart')) return sendRedirect(event, cartPage)

  try {
    const { uuid } = await getValidatedQuery(event, zCartClaimQuery)
    await claimCart(event, uuid)
    return sendRedirect(event, cartPage)
  }
  catch (error) {
    log.warn({
      tag: 'cartClaim',
      message: 'cart claim failed, redirecting without session change',
      error: error instanceof Error ? error.message : String(error),
    })
    return sendRedirect(event, cartPage)
  }
})
