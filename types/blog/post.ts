import { z } from 'zod'
import type { LocationQueryValue } from 'vue-router'
import { ZodAccount } from '~/types/user/account'
import { ZodBlogCategory } from '~/types/blog/category'
import { ZodBlogTag } from '~/types/blog/tag'
import { ZodBlogAuthor } from '~/types/blog/author'
import type { PaginationQuery } from '~/types/pagination'
import type { OrderingQuery } from '~/types/ordering'

export const StatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

const ZodBlogPostTranslations = z.record(
	z.object({
		title: z.string().nullish(),
		subtitle: z.string().nullish(),
		body: z.string().nullish()
	})
)

export const ZodBlogPost = z.object({
	translations: ZodBlogPostTranslations,
	id: z.number().int(),
	slug: z.string().nullish(),
	likes: z.union([z.array(z.number()), z.array(ZodAccount)]),
	category: z.union([z.number(), ZodBlogCategory]),
	tags: z.union([z.array(z.number()), z.array(ZodBlogTag)]),
	author: z.union([z.number(), ZodBlogAuthor]),
	status: StatusEnum,
	featured: z.boolean(),
	viewCount: z.number().int(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	publishedAt: z.string().datetime({ offset: true }).nullish(),
	isPublished: z.boolean(),
	uuid: z.string().uuid(),
	mainImageAbsoluteUrl: z.string().nullish(),
	mainImageFilename: z.string().nullish(),
	numberOfLikes: z.number().int(),
	numberOfComments: z.number().int(),
	postTagsCount: z.number().int(),
	absoluteUrl: z.string()
})

export const ZodBlogPostQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	id: z.string().nullish(),
	author: z.string().nullish(),
	slug: z.string().nullish(),
	tags: z.string().nullish(),
	expand: z.string().nullish()
})

export const ZodBlogPostParams = z.object({
	id: z.string()
})

export type BlogPost = z.infer<typeof ZodBlogPost>
export type BlogPostQuery = PaginationQuery &
	OrderingQuery & {
		id?: string | LocationQueryValue[] | undefined
		author?: string | LocationQueryValue[] | undefined
		slug?: string | LocationQueryValue[] | undefined
		tags?: string | LocationQueryValue[] | undefined
		expand?: string | undefined
	}
export type BlogPostParams = z.infer<typeof ZodBlogPostParams>
export type BlogPostOrderingField = 'createdAt' | 'title' | `publishedAt`
