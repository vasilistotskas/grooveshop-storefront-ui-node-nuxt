import type * as z from 'zod'

export type BlogTag = z.infer<typeof ZodBlogTag>
