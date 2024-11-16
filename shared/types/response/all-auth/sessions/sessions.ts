import type * as z from 'zod'
import type { ZodSessionsDeleteResponse, ZodSessionsGetResponse } from '#shared/schemas/response/all-auth/sessions/sessions'

export type SessionsGetResponse = z.infer<typeof ZodSessionsGetResponse>
export type SessionsDeleteResponse = z.infer<typeof ZodSessionsDeleteResponse>
