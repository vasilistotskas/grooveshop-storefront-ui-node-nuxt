import * as z from 'zod'

export const ZodUserAddress = z.object({
  id: z.number(),
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  zipcode: z.string(),
  floor: z.union([ZodFloorEnum, z.string()]).nullish(),
  locationType: z
    .union([ZodLocationTypeEnum, z.string()])
    .nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.number(),
  country: z.string().nullish(),
  region: z.string().nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodUserAddressQuery = z
  .object({
    id: z.string().nullish(),
    user: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodUserAddressCreateBody = z.object({
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  zipcode: z.string(),
  floor: ZodFloorEnum.nullish(),
  locationType: ZodLocationTypeEnum.nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.number().nullish(),
  country: z.string().nullish(),
  region: z.string().nullish(),
})

export const ZodUserAddressParams = z.object({
  id: z.string(),
})

export const ZodUserAddressPutBody = z.object({
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  zipcode: z.string(),
  floor: ZodFloorEnum.nullish(),
  locationType: ZodLocationTypeEnum.nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.number().nullish(),
  country: z.string().nullish(),
  region: z.string().nullish(),
})
