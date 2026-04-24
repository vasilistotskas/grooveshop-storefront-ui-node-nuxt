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

      const results = await Promise.all(
        keyList.map(key =>
          $fetch<{ name: string, value: string }>(
            `${config.apiBaseUrl}/settings/get`,
            { method: 'GET', query: { key } },
          ).catch(() => ({ name: key, value: '' })),
        ),
      )

      const record: Record<string, string> = {}
      for (const item of results) {
        record[item.name] = item.value
      }

      return await parseDataAs(record, zLoyaltySettingsResponse)
    }
    catch (error) {
      await handleError(error)
    }
  },
  {
    name: 'loyalty-settings',
    maxAge: 300,
    staleMaxAge: 600,
    swr: true,
    getKey: (event) => {
      const query = getQuery(event)
      return `loyalty-settings:${String(query.keys ?? '')}`
    },
  },
)
