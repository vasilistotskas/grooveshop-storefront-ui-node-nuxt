import * as z from 'zod'

export const ZodWebAuthnGetResponse = z.object({
  status: z.literal(200),
  data: ZodWebAuthnCredentialCreationOptions,
})

export const ZodWebAuthnDeleteResponse = z.object({
  status: z.literal(200),
})

export const ZodWebAuthnPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticator,
  meta: z.object({
    recovery_codes_generated: z.boolean(),
  }),
})

export const ZodWebAuthnPutResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticator,
})
