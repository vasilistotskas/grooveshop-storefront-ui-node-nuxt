export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zApiV1SettingsGetRetrieveQuery.parse)
    // useBackendFetch: Django must see X-Forwarded-Host to resolve the
    // tenant schema — a raw $fetch would serve the PUBLIC schema's value
    // for every tenant, turning per-tenant extra_settings (e.g. the
    // CHAT_WIDGET_ENABLED kill switch) platform-global (N1 pattern in
    // MULTI_TENANT_AUDIT.md).
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/settings/get`,
      {
        method: 'GET',
        query,
      },
    )
    return await parseDataAs(response, zApiV1SettingsGetRetrieveResponse)
  }
  catch (error) {
    handleError(error)
  }
})
