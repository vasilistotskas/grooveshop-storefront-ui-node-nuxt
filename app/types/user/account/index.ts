import { object, string, number, boolean, union, lazy, optional } from 'zod'

import { ZodCountry } from '~/types/country'
import { ZodRegion } from '~/types/region'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types'

export const ZodUserAccount = object({
  pk: number().nullish(),
  id: number().nullish(),
  email: string().email().nullish(),
  username: string().nullish(),
  image: string().nullish(),
  firstName: string().nullish(),
  lastName: string().nullish(),
  phone: string().nullish(),
  city: string().nullish(),
  zipcode: string().nullish(),
  address: string().nullish(),
  place: string().nullish(),
  country: union([string(), lazy(() => ZodCountry)]).nullish(),
  region: union([string(), lazy(() => ZodRegion)]).nullish(),
  isActive: boolean().nullish(),
  isStaff: boolean().nullish(),
  birthDate: string().nullish(),
  twitter: string().nullish(),
  linkedin: string().nullish(),
  facebook: string().nullish(),
  instagram: string().nullish(),
  website: string().nullish(),
  youtube: string().nullish(),
  github: string().nullish(),
  bio: string().nullish(),
  mainImagePath: optional(string()),
  isSuperuser: boolean().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodUserAccountParams = object({
  id: string(),
})

export const ZodUserAccountPatchBody = object({
  email: string().nullish(),
  image: string().nullish(),
  firstName: string().nullish(),
  lastName: string().nullish(),
  phone: string().nullish(),
  city: string().nullish(),
  zipcode: string().nullish(),
  address: string().nullish(),
  place: string().nullish(),
  country: string().nullish(),
  region: string().nullish(),
  isActive: boolean().nullish(),
  isStaff: boolean().nullish(),
  birthDate: string().nullish(),
})

export const ZodUserAccountPutBody = object({
  email: string(),
  image: string().nullish(),
  firstName: string().nullish(),
  lastName: string().nullish(),
  phone: string().nullish(),
  city: string().nullish(),
  zipcode: string().nullish(),
  address: string().nullish(),
  place: string().nullish(),
  country: string().nullish(),
  region: string().nullish(),
  isActive: boolean().nullish(),
  isStaff: boolean().nullish(),
  birthDate: string().nullish(),
})

export const ZodChangeUserNameBody = object({
  username: string().max(30),
})

export const ZodChangeUserNameResponse = object({
  detail: string().min(1),
})

export type UserAccount = typeof ZodUserAccount._type
