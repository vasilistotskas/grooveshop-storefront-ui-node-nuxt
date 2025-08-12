import * as z from 'zod'

export const ZodWebAuthnAuthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.record(z.string(), z.any()),
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
      publicKey: z.record(z.string(), z.any()),
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
      publicKey: z.record(z.string(), z.any()),
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
    creation_options: z.object({
      publicKey: z.record(z.string(), z.any()),
    }),
  }),
})

export const ZodWebAuthnSignupPostResponse = z.any()

export const ZodWebAuthnSignupPutResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})
