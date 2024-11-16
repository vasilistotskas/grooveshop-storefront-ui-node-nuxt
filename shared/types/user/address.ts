import type * as z from 'zod'

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
