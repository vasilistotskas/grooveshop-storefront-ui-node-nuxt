import * as z from 'zod'

export const ZodUserAccount = z.object({
  pk: z.number().nullish(),
  id: z.number().nullish(),
  email: z.string().email().nullish(),
  username: z.string().nullish(),
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
  twitter: z.string().nullish(),
  linkedin: z.string().nullish(),
  facebook: z.string().nullish(),
  instagram: z.string().nullish(),
  website: z.string().nullish(),
  youtube: z.string().nullish(),
  github: z.string().nullish(),
  bio: z.string().nullish(),
  mainImagePath: z.string().optional(),
  fullName: z.string().nullish(),
  isSuperuser: z.boolean().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

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

export const ZodChangeUserNameBody = z.object({
  username: z.string().max(30),
})

export const ZodChangeUserNameResponse = z.object({
  detail: z.string().min(1),
})
