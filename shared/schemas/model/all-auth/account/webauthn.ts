import * as z from 'zod'

export const ZodWebAuthnCredentialCreationOptions = z.object({
  creation_options: z.object({
    publicKey: z.record(z.string(), z.any()),
  }),
})
