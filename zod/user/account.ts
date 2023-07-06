import { z } from 'zod'

export const ZodAccount = z.object({
	id: z.number(),
	email: z.string(),
	image: z.string().nullish(),
	firstName: z.string(),
	lastName: z.string(),
	phone: z.string().nullish(),
	city: z.string().nullish(),
	zipcode: z.string().nullish(),
	address: z.string().nullish(),
	place: z.string().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish(),
	isActive: z.boolean(),
	isStaff: z.boolean(),
	birthDate: z.string().nullish(),
	mainImageAbsoluteUrl: z.string(),
	mainImageFilename: z.string(),
	isSuperuser: z.boolean(),
	lastLogin: z.string().nullish(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	uuid: z.string()
})

export const ZodAccountParams = z.object({
	id: z.string()
})

export const ZodAccountPatchRequest = z.object({
	email: z.string().nullish(),
	image: z.string().nullish().nullish(),
	firstName: z.string().nullish(),
	lastName: z.string().nullish(),
	phone: z.string().nullish().nullish(),
	city: z.string().nullish().nullish(),
	zipcode: z.string().nullish().nullish(),
	address: z.string().nullish().nullish(),
	place: z.string().nullish().nullish(),
	country: z.string().nullish().nullish(),
	region: z.string().nullish().nullish(),
	isActive: z.boolean().nullish(),
	isStaff: z.boolean().nullish(),
	birthDate: z.string().nullish()
})

export const ZodAccountPutRequest = z.object({
	email: z.string(),
	image: z.string().nullish().nullish(),
	firstName: z.string(),
	lastName: z.string(),
	phone: z.string().nullish(),
	city: z.string().nullish(),
	zipcode: z.string().nullish(),
	address: z.string().nullish(),
	place: z.string().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish(),
	isActive: z.boolean().nullish(),
	isStaff: z.boolean().nullish(),
	birthDate: z.string().nullish()
})

export type Account = z.infer<typeof ZodAccount>
export type AccountPutRequest = z.infer<typeof ZodAccountPutRequest>
export type AccountParams = z.infer<typeof ZodAccountParams>
export type AccountPatchRequest = z.infer<typeof ZodAccountPatchRequest>
