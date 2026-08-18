export type DeepKeys<T>
  = T extends Record<string, any>
    ? {
        [K in keyof T]-?: K extends string
          ? | `${K}`
          | (T[K] extends Record<string, any>
            ? `${K}.${DeepKeys<T[K]>}`
            : never)
          : never
      }[keyof T]
    : ''

export type TranslationObject<T = Record<string, any>> = {
  translations: Record<string, T>
} & Omit<T, 'translations'>

export type ImageLoading = 'lazy' | 'eager' | undefined

export type ErrorWithDetail = {
  data: {
    data: {
      detail: string
    }
  }
}
