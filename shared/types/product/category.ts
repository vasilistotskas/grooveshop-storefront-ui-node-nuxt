import type * as z from 'zod'

export type ProductCategory = z.infer<typeof ZodProductCategoryBase> & {
  children?: ProductCategory[] | null
}
