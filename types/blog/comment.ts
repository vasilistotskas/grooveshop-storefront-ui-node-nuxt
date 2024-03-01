import { z } from 'zod'

import { ZodBlogPost } from '~/types/blog/post'
import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'
import { ZodUserAccount } from '~/types/user/account'

const ZodBlogCommentTranslations = z.record(
	z.object({
		content: z.string().nullish()
	})
)

export const ZodBlogComment = z.object({
	translations: ZodBlogCommentTranslations,
	id: z.number().int(),
	isApproved: z.boolean(),
	parent: z.number().nullish(),
	level: z.number().nullish(),
	treeId: z.number().nullish(),
	likes: z.union([z.array(z.number()), z.array(z.lazy(() => ZodUserAccount))]),
	user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
	post: z.union([z.number(), z.lazy(() => ZodBlogPost)]),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid(),
	numberOfLikes: z.number().int()
})

export const ZodBlogCommentQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	user: z.string().nullish(),
	post: z.string().nullish()
})

export const ZodBlogCommentParams = z.object({
	id: z.string()
})

export const ZodBlogCommentCreateBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodBlogCommentTranslations
})

export const ZodBlogCommentCreateQuery = z.object({
	expand: z.union([z.literal('true'), z.literal('false')]).nullish()
})

export const ZodBlogCommentPutBody = z.object({
	product: z.string(),
	user: z.string(),
	translations: ZodBlogCommentTranslations
})

export const ZodBlogCommentUserHadCommentedBody = z.object({
	post: z.string(),
	user: z.string()
})

export type BlogCommentQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | undefined
		post?: string | undefined
		user?: string | undefined
		expand?: string | undefined
	}
export type BlogComment = z.infer<typeof ZodBlogComment>
export type BlogCommentParams = z.infer<typeof ZodBlogCommentParams>
export type BlogCommentCreateBody = z.infer<typeof ZodBlogCommentCreateBody>
export type BlogCommentCreateQuery = z.infer<typeof ZodBlogCommentCreateQuery>
export type BlogCommentPutBody = z.infer<typeof ZodBlogCommentPutBody>
export type BlogCommentOrderingField = 'id' | 'userId' | 'postId' | 'createdAt'
export type BlogCommentUserHadCommentedBody = z.infer<
	typeof ZodBlogCommentUserHadCommentedBody
>
