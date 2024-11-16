import * as z from 'zod'

export const ZodWebAuthnDeleteBody = z.object({
  authenticators: z.array(z.number()),
})

export const ZodWebAuthnPostBody = z.object({
  name: z.string(),
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.any(),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnPutBody = z.object({
  id: z.number(),
  name: z.string(),
})
