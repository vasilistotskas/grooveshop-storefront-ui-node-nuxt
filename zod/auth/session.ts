import { z } from 'zod'

export const ZodSession = z.object({
	isAuthenticated: z.boolean()
})

export type Session = z.infer<typeof ZodSession>
