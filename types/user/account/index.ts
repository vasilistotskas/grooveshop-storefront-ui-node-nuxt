import { z } from 'zod'

import { ZodCountry } from '~/types/country'
import { ZodRegion } from '~/types/region'

export const ZodUserAccount = z.object({
  pk: z.number().nullish(),
  id: z.number(),
  email: z.string(),
  image: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phone: z.string().nullish(),
  city: z.string().nullish(),
  zipcode: z.string().nullish(),
  address: z.string().nullish(),
  place: z.string().nullish(),
  country: z.union([z.string(), z.lazy(() => ZodCountry)]).nullish(),
  region: z.union([z.string(), z.lazy(() => ZodRegion)]).nullish(),
  isActive: z.boolean(),
  isStaff: z.boolean(),
  birthDate: z.string().nullish(),
  twitter: z.string().nullish(),
  linkedin: z.string().nullish(),
  facebook: z.string().nullish(),
  instagram: z.string().nullish(),
  website: z.string().nullish(),
  youtube: z.string().nullish(),
  github: z.string().nullish(),
  bio: z.string().nullish(),
  mainImageAbsoluteUrl: z.string().nullish(),
  mainImageFilename: z.string().nullish(),
  isSuperuser: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
})

export const ZodUserAccountParams = z.object({
  id: z.string(),
})

export const ZodUserAccountPatchBody = z.object({
  email: z.string().nullish(),
  image: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phone: z.string().nullish(),
  city: z.string().nullish(),
  zipcode: z.string().nullish(),
  address: z.string().nullish(),
  place: z.string().nullish(),
  country: z.string().nullish(),
  region: z.string().nullish(),
  isActive: z.boolean().nullish(),
  isStaff: z.boolean().nullish(),
  birthDate: z.string().nullish(),
})

export const ZodUserAccountPutBody = z.object({
  email: z.string(),
  image: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phone: z.string().nullish(),
  city: z.string().nullish(),
  zipcode: z.string().nullish(),
  address: z.string().nullish(),
  place: z.string().nullish(),
  country: z.string().nullish(),
  region: z.string().nullish(),
  isActive: z.boolean().nullish(),
  isStaff: z.boolean().nullish(),
  birthDate: z.string().nullish(),
})

export type UserAccount = z.infer<typeof ZodUserAccount>
export type UserAccountPutBody = z.infer<typeof ZodUserAccountPutBody>
export type UserAccountParams = z.infer<typeof ZodUserAccountParams>
export type UserAccountPatchBody = z.infer<typeof ZodUserAccountPatchBody>
