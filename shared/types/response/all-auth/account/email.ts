import type * as z from 'zod'

export type EmailDeleteResponse = z.infer<typeof ZodEmailDeleteResponse>
export type EmailGetResponse = z.infer<typeof ZodEmailGetResponse>
export type EmailPatchResponse = z.infer<typeof ZodEmailPatchResponse>
export type EmailPostResponse = z.infer<typeof ZodEmailPostResponse>
export type EmailPutResponse = z.infer<typeof ZodEmailPutResponse>
