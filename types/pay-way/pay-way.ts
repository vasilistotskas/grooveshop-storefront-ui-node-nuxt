import { z } from 'zod'

export enum PayWayEnum {
	CREDIT_CARD = 'Credit Card',
	PAY_ON_DELIVERY = 'Pay On Delivery'
}

const ZodPayWayTranslations = z.record(
	z.object({
		name: z.string().nullish()
	})
)

export const ZodPayWay = z.object({
	translations: ZodPayWayTranslations,
	id: z.number(),
	active: z.boolean(),
	cost: z.number(),
	freeForOrderAmount: z.number(),
	icon: z.string().nullish(),
	iconAbsoluteUrl: z.string().nullish(),
	iconFilename: z.string().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	sortOrder: z.number().nullish(),
	uuid: z.string()
})

export const ZodPayWayQuery = z.object({
	page: z.string().nullish(),
	ordering: z.string().nullish(),
	active: z.string().nullish(),
	cost: z.string().nullish(),
	freeForOrderAmount: z.string().nullish()
})

export type PayWay = z.infer<typeof ZodPayWay>
export type PayWayQuery = z.infer<typeof ZodPayWayQuery>
