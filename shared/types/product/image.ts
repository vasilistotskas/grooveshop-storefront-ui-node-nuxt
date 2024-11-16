import type * as z from 'zod'

export type ProductImage = z.infer<typeof ZodProductImage>
