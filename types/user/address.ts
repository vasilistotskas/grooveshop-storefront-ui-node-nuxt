import { z } from 'zod'

import { ZodCountry } from '~/types/country'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'
import type { OrderingQuery } from '~/types/ordering'
import type { PaginationQuery } from '~/types/pagination'
import { ZodRegion } from '~/types/region'
import { ZodUserAccount } from '~/types/user/account'

export const ZodUserAddress = z.object({
  id: z.number(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
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
})

export const ZodUserAddressQuery = z.object({
  page: z.string().nullish(),
  ordering: z.string().nullish(),
  id: z.string().nullish(),
  user: z.string().nullish(),
  expand: z.union([z.literal('true'), z.literal('false')]).nullish(),
  pagination: z.union([z.literal('true'), z.literal('false')]).nullish(),
})

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
export type UserAddressParams = z.infer<typeof ZodUserAddressParams>
export type UserAddressPutBody = z.infer<typeof ZodUserAddressPutBody>
export type UserAddressCreateBody = z.infer<typeof ZodUserAddressCreateBody>
export type UserAddressQuery = PaginationQuery &
  OrderingQuery & {
    id?: string | undefined
    user?: string | undefined
    expand?: string | undefined
  }
export type UserAddressOrderingField =
  | 'id'
  | 'user'
  | 'country'
  | 'zipcode'
  | 'floor'
  | 'locationType'
  | 'isMain'
  | 'createdAt'
  | 'updatedAt'
