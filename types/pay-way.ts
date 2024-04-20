import { z } from 'zod'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery } from '~/types'

export enum PayWayEnum {
  CREDIT_CARD = 'Credit Card',
  PAY_ON_DELIVERY = 'Pay On Delivery',
}

const ZodPayWayTranslations = z.record(
  z.object({
    name: z.string().nullish(),
  }),
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
  uuid: z.string().uuid(),
})

export const ZodPayWayQuery = z
  .object({
    active: z.string().nullish(),
    cost: z.string().nullish(),
    freeForOrderAmount: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type PayWay = z.infer<typeof ZodPayWay>
