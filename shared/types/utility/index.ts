export type EntityOrPrimitive<T> = T | number

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

export type NestedKeyOf<ObjectType extends Record<string, any>> = {
  [Key in keyof ObjectType]: ObjectType[Key] extends Record<string, any>
    ? NestedKeyOf<ObjectType[Key]>
    : Key
}[keyof ObjectType]

export type DeepPartial<T> = Partial<{
  [P in keyof T]: DeepPartial<T[P]> | { [key: string]: string | object }
}>

export type DeepKey<T, Keys extends string[]> = Keys extends [
  infer First,
  ...infer Rest,
]
  ? First extends keyof T
    ? Rest extends string[]
      ? DeepKey<T[First], Rest>
      : never
    : never
  : T

export type ExtractDeepKey<T, Path extends string[]>
  = DeepKey<T, Path> extends infer Result
    ? Result extends Record<string, any>
      ? keyof Result
      : never
    : never

export type ExtractDeepObject<T, Path extends string[]>
  = DeepKey<T, Path> extends infer Result
    ? Result extends Record<string, any>
      ? Result
      : never
    : never

export type TranslationObject<T = Record<string, any>> = {
  translations: Record<string, T>
} & Omit<T, 'translations'>

export type WithTranslations<T = Record<string, any>> = {
  translations: Record<string, Record<string, any>>
} & T

export type ExtractIfTranslationObject<T>
  = T extends WithTranslations<infer U> ? U : T

export type ImageLoading = 'lazy' | 'eager' | undefined

export type ErrorWithDetail = {
  data: {
    data: {
      detail: string
    }
  }
}

export type ScreenSize
  = | typeof ScreenSizeEnum.SMALL
    | typeof ScreenSizeEnum.MEDIUM
    | typeof ScreenSizeEnum.LARGE
    | typeof ScreenSizeEnum.EXTRA_LARGE
