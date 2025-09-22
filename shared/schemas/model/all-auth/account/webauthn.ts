import * as z from 'zod'

export const ZodWebAuthnCredentialCreationOptions = z.object({
  creation_options: z.object({
    publicKey: z.object({
      challenge: z.string(),
      rpId: z.string().optional(),
      allowCredentials: z.array(z.any()).optional(),
      userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      pubKeyCredParams: z.array(z.any()),
      rp: z.object({
        id: z.string().optional(),
        name: z.string(),
      }),
      user: z.object({
        id: z.string(),
        name: z.string(),
        displayName: z.string(),
      }),
    }),
  }),
})
