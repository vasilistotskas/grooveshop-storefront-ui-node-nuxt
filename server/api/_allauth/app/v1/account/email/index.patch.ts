import { ZodEmailPatchBody, ZodEmailPatchResponse } from '~/types/all-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodEmailPatchBody.parse)
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/account/email`, {
      body: validatedBody,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await parseDataAs(response, ZodEmailPatchResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
