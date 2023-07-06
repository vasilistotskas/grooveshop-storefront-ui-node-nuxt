import { z } from 'zod'
import { PaginationQuery } from '~/zod/pagination/pagination'
import { OrderingQuery } from '~/zod/ordering/ordering'

export const ZodProduct = z.object({
	id: z.number().int(),
	name: z.string(),
	slug: z.string(),
	category: z.number().int(),
	absoluteUrl: z.string(),
	description: z.string().nullish(),
	price: z.number(),
	vat: z.number(),
	vatPercent: z.number(),
	vatValue: z.number(),
	finalPrice: z.number(),
	hits: z.number().int(),
	likesCounter: z.number().int(),
	stock: z.number().int(),
	active: z.boolean(),
	weight: z.number(),
	seoTitle: z.string().nullish(),
	seoDescription: z.string().nullish(),
	seoKeywords: z.string().nullish(),
	uuid: z.string().uuid(),
	discountPercent: z.number(),
	discountValue: z.number(),
	priceSavePercent: z.number(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	mainImageAbsoluteUrl: z.string(),
	mainImageFilename: z.string(),
	reviewAverage: z.number(),
	reviewCounter: z.number().int()
})

export const ZodProductCreateRequest = z.object({
	name: z.string(),
	slug: z.string(),
	category: z.number().int(),
	description: z.string().nullish(),
	price: z.number(),
	vat: z.number(),
	hits: z.number().int().nullish(),
	stock: z.number().int().nullish(),
	active: z.boolean().nullish(),
	weight: z.number().nullish(),
	seoTitle: z.string().nullish(),
	seoDescription: z.string().nullish(),
	seoKeywords: z.string().nullish(),
	discountPercent: z.number().nullish()
})

export const ZodProductParams = z.object({
	id: z.string()
})

export const ZodProductQuery = z.object({
	offset: z.string().nullish(),
	limit: z.string().nullish(),
	ordering: z.string().nullish()
})

export type Product = Readonly<z.infer<typeof ZodProduct>>
export type ProductParams = z.infer<typeof ZodProductParams>
export type ProductCreateRequest = z.infer<typeof ZodProductCreateRequest>
export type ProductQuery = PaginationQuery & OrderingQuery
export type ProductOrderingField = 'name' | 'price' | 'createdAt'
