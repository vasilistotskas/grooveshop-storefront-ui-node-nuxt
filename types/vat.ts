import { z } from 'zod'

export const ZodVat = z.object({
	id: z.number().int(),
	value: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid()
})

export type Vat = z.infer<typeof ZodVat>
