import type { EntityOrdering, OrderingOption } from '~/types/ordering'

export const useOrdering = <T extends string>(
	ordering: EntityOrdering<T>,
	orderingFields: Partial<Record<T, OrderingOption[]>>
) => {
	const orderingOptions = computed(() => {
		ordering.forEach(({ value, label, options: opt }) => {
			orderingFields[value] = opt.map((option) => {
				const newValue = option === 'ascending' ? value : `-${value}`
				return {
					value: newValue,
					label: `${label} ${option}`
				}
			})
		})
		return orderingFields
	})

	const orderingOptionsArray = computed(() => {
		const options: OrderingOption[] = []
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		Object.entries(orderingOptions.value).forEach(([key, value]) => {
			const orderingOptionsForKey = value as OrderingOption[]
			orderingOptionsForKey.forEach((option) => {
				options.push({
					value: String(option.value),
					label: option.label
				})
			})
		})
		return options
	})
	return {
		orderingOptions,
		orderingOptionsArray
	}
}
