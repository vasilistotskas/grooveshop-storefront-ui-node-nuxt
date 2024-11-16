import type * as z from 'zod'

export type Cart = z.infer<typeof ZodCart>
