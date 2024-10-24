import { ZodConfigResponse } from '~/types/all-auth'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.djangoUrl}/_allauth/app/v1/config`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodConfigResponse)
  }
  catch (error) {
    await handleAllAuthError(error)
  }
}, { maxAge, base, name: 'AllAuthConfig' })
