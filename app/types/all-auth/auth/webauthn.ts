import { z } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodWebAuthnAuthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.object({
        challenge: z.string(),
        rpId: z.string().optional(),
        allowCredentials: z.array(z.object({
          type: z.literal('public-key'),
          id: z.string(),
          transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
        })).optional(),
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

export const ZodWebAuthnAuthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    authenticatorAttachment: z.string().nullish(),
    response: z.object({
      clientDataJSON: z.any(),
      transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
      attestationObject: z.any().optional(),
      authenticatorData: z.string().optional(),
      signature: z.string().optional(),
      userHandle: z.string().optional(),
    }),
    clientExtensionResults: z.object({
      appid: z.string().optional(),
      appidExclude: z.string().optional(),
      credProps: z.object({
        rk: z.boolean(),
      }).optional(),
    }).optional(),
  }),
})

export const ZodWebAuthnReauthenticateGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    request_options: z.object({
      publicKey: z.object({
        challenge: z.string(),
        rpId: z.string().optional(),
        allowCredentials: z.array(z.object({
          type: z.literal('public-key'),
          id: z.string(),
          transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
        })).optional(),
        userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      }),
    }),
  }),
})

export const ZodWebAuthnReauthenticatePostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    authenticatorAttachment: z.string().nullish(),
    response: z.object({
      clientDataJSON: z.any(),
      transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
      attestationObject: z.any().optional(),
      authenticatorData: z.string().optional(),
      signature: z.string().optional(),
      userHandle: z.string().optional(),
    }),
    clientExtensionResults: z.object({
      appid: z.string().optional(),
      appidExclude: z.string().optional(),
      credProps: z.object({
        rk: z.boolean(),
      }).optional(),
    }).optional(),
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
        allowCredentials: z.array(z.object({
          type: z.literal('public-key'),
          id: z.string(),
          transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
        })).optional(),
        userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
      }),
    }),
  }),
})

export const ZodWebAuthnLoginPostBody = z.object({
  credential: z.object({
    type: z.string(),
    id: z.string(),
    rawId: z.any(),
    authenticatorAttachment: z.string().nullish(),
    response: z.object({
      clientDataJSON: z.any(),
      transports: z.array(z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb'])).optional(),
      attestationObject: z.any().optional(),
      authenticatorData: z.string().optional(),
      signature: z.string().optional(),
      userHandle: z.string().optional(),
    }),
    clientExtensionResults: z.object({
      appid: z.string().optional(),
      appidExclude: z.string().optional(),
      credProps: z.object({
        rk: z.boolean(),
      }).optional(),
    }).optional(),
  }),
})

export const ZodWebAuthnLoginPostResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type WebAuthnAuthenticateGetResponse = z.infer<typeof ZodWebAuthnAuthenticateGetResponse>
export type WebAuthnAuthenticatePostResponse = z.infer<typeof ZodWebAuthnAuthenticatePostResponse>
export type WebAuthnAuthenticatePostBody = z.infer<typeof ZodWebAuthnAuthenticatePostBody>
export type WebAuthnReauthenticateGetResponse = z.infer<typeof ZodWebAuthnReauthenticateGetResponse>
export type WebAuthnReauthenticatePostBody = z.infer<typeof ZodWebAuthnReauthenticatePostBody>
export type WebAuthnReauthenticatePostResponse = z.infer<typeof ZodWebAuthnReauthenticatePostResponse>
export type WebAuthnLoginGetResponse = z.infer<typeof ZodWebAuthnLoginGetResponse>
export type WebAuthnLoginPostBody = z.infer<typeof ZodWebAuthnLoginPostBody>
export type WebAuthnLoginPostResponse = z.infer<typeof ZodWebAuthnLoginPostResponse>
