import type * as z from 'zod'

export type CartItem = Readonly<z.infer<typeof ZodCartItem>>
export type CartItemCreateBody = z.infer<typeof ZodCartItemCreateBody>
export type CartItemPutBody = z.infer<typeof ZodCartItemPutBody>
export type CartItemCreateResponse = z.infer<typeof ZodCartItemCreateResponse>
