import { defaultSelectOptionChoose } from '~/constants/general'

const excludedOptions = [defaultSelectOptionChoose]

export const processValues = (
  values: Record<string, any>,
  defaultOptions: string[] = excludedOptions,
) => {
  return Object.keys(values).reduce(
    (acc, key) => {
      const validKey = key as keyof typeof values
      if (defaultOptions.includes(String(values[validKey]))) {
        acc[validKey] = null as never
      }
      else {
        acc[validKey] = values[validKey] as never
      }
      return acc
    },
    {} as typeof values,
  )
}
