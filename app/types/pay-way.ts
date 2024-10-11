import { object, string, number, boolean, record } from 'zod'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodLanguageQuery, ZodSortableModel, ZodTimeStampModel, ZodUUIDModel } from '~/types'

const ZodPayWayTranslations = record(
  object({
    name: string().nullish(),
  }),
)

export const ZodPayWay = object({
  translations: ZodPayWayTranslations,
  id: number(),
  active: boolean(),
  cost: number(),
  freeForOrderAmount: number(),
  icon: string().nullish(),
  iconAbsoluteUrl: string().nullish(),
  iconFilename: string().nullish(),
})
  .merge(ZodUUIDModel)
  .merge(ZodTimeStampModel)
  .merge(ZodSortableModel)

export const ZodPayWayQuery = object({
  active: string().nullish(),
  cost: string().nullish(),
  freeForOrderAmount: string().nullish(),
})
  .merge(ZodLanguageQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export type PayWay = typeof ZodPayWay._type
