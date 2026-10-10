import * as z from 'zod'

/**
 * The agent gateway's `products` SSE event: which products a
 * `search_products` / `get_product` tool call surfaced, as ids only — the
 * storefront loads each product itself, so the price shown is the one
 * this shopper pays. Ids arrive in order and de-duplicated across the
 * turn; a search can match more than it lists (`total`), or list none.
 */
export const zChatProductsEvent = z.object({
  tool: z.string(),
  query: z.string().optional(),
  total: z.number().int().nonnegative().optional(),
  products: z.array(z.object({ id: z.number().int().positive() })),
})

export type ChatProductsEvent = z.infer<typeof zChatProductsEvent>
