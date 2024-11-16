import type * as z from 'zod'

export type Contact = z.infer<typeof ZodContact>
export type ContactBody = z.infer<typeof ZodContactBody>
