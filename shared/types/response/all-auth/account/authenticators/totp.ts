import type * as z from 'zod'

export type TotpDeleteResponse = z.infer<typeof ZodTotpDeleteResponse>
export type TotpGetResponse = z.infer<typeof ZodTotpGetResponse>
export type TotpGetResponseError = z.infer<typeof ZodTotpGetResponseError>
export type TotpPostResponse = z.infer<typeof ZodTotpPostResponse>
