import type { AvatarProps } from '#ui/types'

export interface OrderingOption {
  value: string
  label: string
  labelClass?: string
  slot?: string
  icon?: string
  iconClass?: string
  avatar?: AvatarProps
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

export interface LinksOption {
  to: string
  label: string
  labelClass?: string
  avatar?: AvatarProps
  icon?: string
}
