import type * as z from 'zod'

export type OrderOrderingField = 'status' | 'createdAt' | 'updatedAt'
export type Order = z.infer<typeof ZodOrder>
export type OrderCreateBody = z.infer<typeof ZodOrderCreateBody>
export type OrderCreateResponse = z.infer<typeof ZodOrderCreateResponse>
