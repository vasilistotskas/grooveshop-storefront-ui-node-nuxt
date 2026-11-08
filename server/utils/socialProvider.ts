import { createError, useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * Answer 404 unless the store offers `provider` for sign-in.
 *
 * The OAuth routes (`server/routes/auth/*`) start a flow with the
 * platform's app credentials whatever the store allows, so a store that
 * switched a provider off (`SOCIAL_LOGIN_PROVIDERS`) still sent a shopper
 * through that provider's consent screen, only for Django to refuse the
 * token. The list is the one the sign-in buttons draw
 * (`usableSocialProviders`), read from the store's allauth config, which
 * is public.
 */
export async function requireSocialProvider(event: RequestEvent, provider: string): Promise<void> {
  const { djangoUrl } = useRuntimeConfig()
  const fetchForStore = backendFetchFor({ tenantHost: requestTenantHost(event), locale: requestLocale(event) })
  const { data } = await parseDataAs(
    fetchForStore(`${djangoUrl}/_allauth/app/v1/config`, { method: 'GET' }),
    zGetAllauthAppV1ConfigResponse,
  )
  if (usableSocialProviders(data).some(entry => entry.id === provider)) return
  throw createError({ status: 404, statusText: 'Not Found' })
}
