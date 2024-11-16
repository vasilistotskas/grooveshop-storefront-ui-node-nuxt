import type * as z from 'zod'

export type BlogComment = z.infer<typeof ZodBlogCommentBase> & {
  children?: BlogComment[] | null | number[]
}
export type BlogCommentOrderingField = 'id' | 'userId' | 'postId' | 'createdAt'
