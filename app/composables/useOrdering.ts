export const useOrdering = <T extends string>(ordering: EntityOrdering<T>) => {
  const orderingOptions = computed(() => {
    const fields: Partial<Record<T, OrderingOption[]>> = {}
    ordering.forEach(({ value, label, options: opt }) => {
      fields[value] = opt.map((option) => {
        const newValue = option === 'ascending' ? value : `-${value}`
        const optionUpDown = option === 'ascending' ? '▲' : '▼'
        return {
          value: newValue,
          label: `${label} ${optionUpDown}`,
        }
      })
    })
    return fields
  })

  const orderingOptionsArray = computed(() => {
    const options: OrderingOption[] = []
    Object.entries(orderingOptions.value).forEach(([_, value]) => {
      options.push(...(value as OrderingOption[]))
    })
    return options
  })

  return {
    orderingOptions,
    orderingOptionsArray,
  }
}
