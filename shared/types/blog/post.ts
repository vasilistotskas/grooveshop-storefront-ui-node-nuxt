import type * as z from 'zod'

export type BlogPost = z.infer<typeof ZodBlogPost>
export type BlogPostOrderingField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
