export type DebugMode = 'consola' | 'silent'
export type TranslateEngine = 'google' | 'deepl' | 'libre' | 'yandex'

export interface LocaleFile {
  path: string
  langCode: string
  dir: string
}

export enum FileExtensions {
  YML = 'yml',
  YAML = 'yaml',
  JSON = 'json',
  TS = 'ts',
  MTS = 'mts',
  JS = 'js',
  CJS = 'cjs',
}

export type LocaleOption = {
  label: string
  value: `${string}-${string}` | string
}
