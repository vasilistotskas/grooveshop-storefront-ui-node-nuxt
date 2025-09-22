import * as z from 'zod'

export const ZodWebAuthnAuthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string(),
    }),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnReauthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string(),
    }),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnLoginPostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string(),
    }),
    authenticatorAttachment: z.string().nullish(),
    clientExtensionResults: z.any().optional(),
  }),
})

export const ZodWebAuthnSignupPostBody = z.object({
  email: z.string(),
  phone: z.string().optional(),
  username: z.string().optional(),
})

export const ZodWebAuthnSignupPutBody = z.object({
  name: z.string(),
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    authenticatorAttachment: z.string().nullish(),
    response: z.any(),
    clientExtensionResults: z.any().optional(),
  }),
})
