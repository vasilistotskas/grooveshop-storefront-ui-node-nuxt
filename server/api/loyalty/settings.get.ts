import { z } from 'zod'

const zLoyaltySettingsQuery = z.object({
  keys: z.string().min(1),
})

const zLoyaltySettingsResponse = z.record(z.string(), z.string())

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    try {
      const { keys } = await getValidatedQuery(event, zLoyaltySettingsQuery.parse)
      const keyList = keys.split(',').map(k => k.trim()).filter(Boolean)

      // One bulk read of the store's public settings, not one Django
      // round trip per key (eight, for the loyalty set). Every loyalty
      // key is public, so the bulk endpoint serves them all.
      //
      // useBackendFetch: X-Forwarded-Host makes Django's
      // TenantMainMiddleware resolve the caller's schema — without it
      // the lookup falls back to the public schema and every tenant
      // caches the platform-default loyalty values.
      const { settings } = await useBackendFetch()<PublicSettings>(
        `${config.apiBaseUrl}/settings/public`,
        { method: 'GET' },
      )

      // A key without a row answers '' — the client's parsers treat an
      // empty string as "not configured", exactly as before.
      const record: Record<string, string> = {}
      for (const key of keyList) {
        record[key] = settings[key] ?? ''
      }

      return await parseDataAs(record, zLoyaltySettingsResponse)
    }
    catch (error) {
      handleError(error)
    }
  },
  {
    name: 'loyalty-settings',
    maxAge: 300,
    staleMaxAge: 600,
    swr: true,
    getKey: (event) => {
      const query = getQuery(event)
      return tenantCacheKey(event, `loyalty-settings:${String(query.keys ?? '')}`)
    },
  },
)
