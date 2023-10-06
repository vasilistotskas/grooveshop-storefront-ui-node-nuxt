import { z } from 'zod'

export const ZodCategory = z.object({
	id: z.number(),
	name: z.string(),
	slug: z.string(),
	description: z.string(),
	categoryMenuImageOneAbsoluteUrl: z.string(),
	categoryMenuImageOneFilename: z.string(),
	categoryMenuImageTwoAbsoluteUrl: z.string(),
	categoryMenuImageTwoFilename: z.string(),
	categoryMenuMainBannerAbsolute_url: z.string(),
	categoryMenuMainBannerFilename: z.string(),
	parent: z.number(),
	level: z.number(),
	treeId: z.number(),
	absoluteUrl: z.string(),
	recursiveProductCount: z.number(),
	seoTitle: z.string().nullish(),
	seoDescription: z.string().nullish(),
	seoKeywords: z.string().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string()
})

export const ZodCategoryCreateBody = z.object({
	name: z.string(),
	slug: z.string(),
	description: z.string().nullish(),
	parent: z.number().nullish(),
	seoTitle: z.string().nullish(),
	seoDescription: z.string().nullish(),
	seoKeywords: z.string().nullish(),
	createdAt: z.string().nullish()
})

export const ZodCategoryParams = z.object({
	id: z.string()
})

export type Category = z.infer<typeof ZodCategory>
export type CategoryParams = Readonly<z.infer<typeof ZodCategoryParams>>
export type CategoryCreateBody = Readonly<z.infer<typeof ZodCategoryCreateBody>>
