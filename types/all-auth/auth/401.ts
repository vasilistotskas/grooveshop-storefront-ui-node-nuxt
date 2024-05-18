import { z } from 'zod'

const ZodProvider = z.object({
  id: z.string(),
  name: z.string(),
  flows: z.array(z.enum(['provider_redirect', 'provider_token'])),
  client_id: z.string().optional(),
}).optional()

const ZodFlow = z.object({
  id: z.enum([
    'verify_email',
    'login',
    'login_by_code',
    'signup',
    'provider_redirect',
    'provider_signup',
    'provider_token',
    'reauthenticate',
    'mfa_reauthenticate',
    'mfa_authenticate',
  ]),
  provider: ZodProvider,
  is_pending: z.boolean().optional(),
})

const ZodNotAuthenticatedData = z.object({
  flows: z.array(ZodFlow),
})

const ZodMeta = z.object({
  session_token: z.string().optional(),
  access_token: z.string().optional(),
  is_authenticated: z.literal(false),
})

export const ZodNotAuthenticatedResponse = z.object({
  status: z.literal(401),
  data: ZodNotAuthenticatedData,
  meta: ZodMeta,
})

export type NotAuthenticatedData = z.infer<typeof ZodNotAuthenticatedData>
export type NotAuthenticatedResponse = z.infer<typeof ZodNotAuthenticatedResponse>
