import * as z from 'zod'

import { ZodCountry } from '~/types/country'
import {
  FloorChoicesEnum,
  LocationChoicesEnum,
  ZodExpandQuery,
  ZodLanguageQuery, ZodTimeStampModel, ZodUUIDModel,
} from '~/types'
import { ZodRegion } from '~/types/region'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'

export const ZodUserAddress = z.object({
  id: z.number(),
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  zipcode: z.string(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string()])
    .nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
  country: z.union([z.string(), z.lazy(() => ZodCountry)]).nullish(),
  region: z.union([z.string(), z.lazy(() => ZodRegion)]).nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodUserAddressQuery = z
  .object({
    id: z.string().nullish(),
    user: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
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
  floor: z.nativeEnum(FloorChoicesEnum).nullish(),
  locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
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
  floor: z.nativeEnum(FloorChoicesEnum).nullish(),
  locationType: z.nativeEnum(LocationChoicesEnum).nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.number().nullish(),
  country: z.string().nullish(),
  region: z.string().nullish(),
})

export type UserAddress = z.infer<typeof ZodUserAddress>
export type UserAddressOrderingField =
  | 'id'
  | 'country'
  | 'zipcode'
  | 'floor'
  | 'locationType'
  | 'isMain'
  | 'createdAt'
  | 'updatedAt'
