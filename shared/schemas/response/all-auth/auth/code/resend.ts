import * as z from 'zod'

/**
 * `POST /auth/code/resend` and `POST /auth/email/verify/resend` answer
 * allauth's `StatusOK` response (headless `ResendLoginCodeView` and
 * `ResendEmailVerificationCodeView`): `{status: 200}`, plus the `meta` token
 * fields allauth adds to any app-client response when the session token
 * changes. There is no `data`. The 409 (`ConflictResponse`) and 429
 * (`TooManyRequests`) bodies are `{status}` only.
 */
export const ZodCodeResendResponse = z.object({
  status: z.literal(200),
  meta: ZodAuthenticationMeta.optional(),
})
