import { object, string, number, boolean, union, nativeEnum, lazy } from 'zod'

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

export const ZodUserAddress = object({
  id: number(),
  title: string(),
  firstName: string(),
  lastName: string(),
  street: string(),
  streetNumber: string(),
  city: string(),
  zipcode: string(),
  floor: union([nativeEnum(FloorChoicesEnum), string()]).nullish(),
  locationType: union([nativeEnum(LocationChoicesEnum), string()]).nullish(),
  phone: string().nullish(),
  mobilePhone: string().nullish(),
  notes: string().nullish(),
  isMain: boolean().nullish(),
  user: union([number(), lazy(() => ZodUserAccount)]),
  country: union([string(), lazy(() => ZodCountry)]).nullish(),
  region: union([string(), lazy(() => ZodRegion)]).nullish(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodUserAddressQuery = object({
  id: string().nullish(),
  user: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodUserAddressCreateBody = object({
  title: string(),
  firstName: string(),
  lastName: string(),
  street: string(),
  streetNumber: string(),
  city: string(),
  zipcode: string(),
  floor: nativeEnum(FloorChoicesEnum).nullish(),
  locationType: nativeEnum(LocationChoicesEnum).nullish(),
  phone: string().nullish(),
  mobilePhone: string().nullish(),
  notes: string().nullish(),
  isMain: boolean().nullish(),
  user: number().nullish(),
  country: string().nullish(),
  region: string().nullish(),
})

export const ZodUserAddressParams = object({
  id: string(),
})

export const ZodUserAddressPutBody = object({
  title: string(),
  firstName: string(),
  lastName: string(),
  street: string(),
  streetNumber: string(),
  city: string(),
  zipcode: string(),
  floor: nativeEnum(FloorChoicesEnum).nullish(),
  locationType: nativeEnum(LocationChoicesEnum).nullish(),
  phone: string().nullish(),
  mobilePhone: string().nullish(),
  notes: string().nullish(),
  isMain: boolean().nullish(),
  user: number().nullish(),
  country: string().nullish(),
  region: string().nullish(),
})

export type UserAddress = typeof ZodUserAddress._type
export type UserAddressOrderingField =
  | 'id'
  | 'country'
  | 'zipcode'
  | 'floor'
  | 'locationType'
  | 'isMain'
  | 'createdAt'
  | 'updatedAt'
