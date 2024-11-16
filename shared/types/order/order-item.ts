import type * as z from 'zod'

export type OrderItem = z.infer<typeof ZodOrderItem>
