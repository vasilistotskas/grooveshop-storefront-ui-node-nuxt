import type * as z from 'zod'

export type EmailDeleteBody = z.infer<typeof ZodEmailDeleteBody>
export type EmailPatchBody = z.infer<typeof ZodEmailPatchBody>
export type EmailPostBody = z.infer<typeof ZodEmailPostBody>
export type EmailPutBody = z.infer<typeof ZodEmailPutBody>
