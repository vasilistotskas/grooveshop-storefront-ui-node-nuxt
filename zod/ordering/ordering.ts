import { LocationQueryValue } from 'vue-router'

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
