import * as z from 'zod'

export const ZodWebAuthnAuthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.object({
        challenge: z.string(),
        rpId: z.string().optional(),
        allowCredentials: z.array(z.any()).optional(),
        userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      }),
    }),
  }),
})

export const ZodWebAuthnAuthenticatePostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnReauthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.object({
        challenge: z.string(),
        rpId: z.string().optional(),
        allowCredentials: z.array(z.any()).optional(),
        userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      }),
    }),
  }),
})

export const ZodWebAuthnReauthenticatePostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.object({
        challenge: z.string(),
        rpId: z.string().optional(),
        allowCredentials: z.array(z.any()).optional(),
        userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      }),
    }),
  }),
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnLoginPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export const ZodWebAuthnSignupGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
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
  }),
})

export const ZodWebAuthnSignupPostResponse = z.any()

export const ZodWebAuthnSignupPutResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})
