import type { LocationQueryValue } from 'vue-router'
import { z } from 'zod'

export interface OrderingOption {
  value: string
  label: string
}

export type EntityOrdering<OrderingField extends string> = {
  value: OrderingField
  label: string
  options: ('ascending' | 'descending')[]
}[]

export type OrderingQuery = {
  ordering?: string | LocationQueryValue[] | undefined
}

export const ZodOrderingQuery = z.object({
  ordering: z.union([z.number(), z.string()]).nullish(),
})
