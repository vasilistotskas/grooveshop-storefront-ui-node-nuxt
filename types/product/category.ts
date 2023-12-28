import { z } from 'zod'

const ZodCategoryTranslations = z.record(
	z.object({
		name: z.string().nullish(),
		description: z.string().nullish()
	})
)

export const ZodCategory = z.object({
	translations: ZodCategoryTranslations,
	id: z.number(),
	slug: z.string(),
	categoryMenuImageOneAbsoluteUrl: z.string().nullish(),
	categoryMenuImageOneFilename: z.string().nullish(),
	categoryMenuImageTwoAbsoluteUrl: z.string().nullish(),
	categoryMenuImageTwoFilename: z.string().nullish(),
	categoryMenuMainBannerAbsolute_url: z.string().nullish(),
	categoryMenuMainBannerFilename: z.string().nullish(),
	parent: z.number().nullish(),
	level: z.number(),
	treeId: z.number(),
	absoluteUrl: z.string(),
	recursiveProductCount: z.number(),
	seoTitle: z.string().nullish(),
	seoDescription: z.string().nullish(),
	seoKeywords: z.string().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string().uuid()
})

export const ZodCategoryParams = z.object({
	id: z.string()
})

export type Category = z.infer<typeof ZodCategory>
export type CategoryParams = Readonly<z.infer<typeof ZodCategoryParams>>
