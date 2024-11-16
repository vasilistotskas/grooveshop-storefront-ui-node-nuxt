import type * as z from 'zod'

export type BlogCategory = z.infer<typeof ZodBlogCategory>
