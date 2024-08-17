import { z } from 'zod'

export const ZodWebAuthnGetResponse = z.object({
  status: z.literal(200),
  data: z.object({
    creation_options: z.object({
      publicKey: z.object({
        rp: z.object({
          id: z.string().optional(),
          name: z.string(),
        }).optional(),
        user: z.object({
          id: z.string(),
          name: z.string(),
          displayName: z.string(),
        }).optional(),
        challenge: z.string(),
        pubKeyCredParams: z.array(z.object({
          type: z.enum(['public-key']),
          alg: z.number(),
        })).optional(),
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

export const ZodWebAuthnDeleteBody = z.object({
  authenticators: z.array(z.number()),
})

export const ZodWebAuthnDeleteResponse = z.object({
  status: z.literal(200),
})

export const ZodWebAuthnPostBody = z.object({
  name: z.string(),
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

export const ZodWebAuthnPostResponse = z.object({
  status: z.literal(200),
  data: z.object({
    last_used_at: z.number().nullable(),
    created_at: z.number(),
    type: z.string(),
    id: z.number(),
    name: z.string(),
    is_passwordless: z.boolean().optional(),
  }),
  meta: z.object({
    recovery_codes_generated: z.boolean(),
  }),
})

export const ZodWebAuthnPutBody = z.object({
  id: z.number(),
  name: z.string(),
})

export const ZodWebAuthnPutResponse = z.object({
  status: z.literal(200),
  data: z.object({
    last_used_at: z.number(),
    created_at: z.number(),
    type: z.string(),
    id: z.number(),
    name: z.string(),
    is_passwordless: z.boolean().optional(),
  }),
})

export type WebAuthnGetResponse = z.infer<typeof ZodWebAuthnGetResponse>
export type WebAuthnDeleteBody = z.infer<typeof ZodWebAuthnDeleteBody>
export type WebAuthnDeleteResponse = z.infer<typeof ZodWebAuthnDeleteResponse>
export type WebAuthnPostBody = z.infer<typeof ZodWebAuthnPostBody>
export type WebAuthnPostResponse = z.infer<typeof ZodWebAuthnPostResponse>
export type WebAuthnPutBody = z.infer<typeof ZodWebAuthnPutBody>
export type WebAuthnPutResponse = z.infer<typeof ZodWebAuthnPutResponse>
