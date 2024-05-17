import { z } from 'zod'
import type { ConfigResponse } from '~/types/all-auth'

export const ZodConfigResponse = z.object({
  status: z.number(),
  data: z.object({
    account: z.object({
      authentication_method: z.string(),
    }),
    socialaccount: z.object({
      providers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          flows: z.array(z.string()),
          client_id: z.string().optional(),
        }),
      ),
    }).optional(),
    mfa: z.object({
      supported_types: z.array(z.string()),
    }).optional(),
    usersessions: z.object({
      track_activity: z.boolean(),
    }).optional(),
  }),
}) as z.ZodType<ConfigResponse>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.djangoUrl}/_allauth/app/v1/auth/session`, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodConfigResponse)
  }
  catch (error) {
    await handleAllAuthError(error, event)
  }
})
