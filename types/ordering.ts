import { z } from 'zod'
import type { Avatar } from '#ui/types/avatar'

export interface OrderingOption {
  value: string
  label: string
  labelClass?: string
  slot?: string
  icon?: string
  iconClass?: string
  avatar?: Avatar
  shortcuts?: string[]
  disabled?: boolean
  class?: string
  click?: () => void
}

export type EntityOrdering<OrderingField extends string> = {
  value: OrderingField
  label: string
  options: ('ascending' | 'descending')[]
}[]

export const ZodOrderingQuery = z.object({
  ordering: z.union([z.number(), z.string()]).nullish(),
})
