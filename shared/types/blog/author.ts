import type * as z from 'zod'

export type BlogAuthor = z.infer<typeof ZodBlogAuthor>
