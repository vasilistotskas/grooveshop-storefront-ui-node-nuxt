import type * as z from 'zod'

export type UserAccount = z.infer<typeof ZodUserAccount>
export type ChangeUserNameResponse = z.infer<typeof ZodChangeUserNameResponse>
