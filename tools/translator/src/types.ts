export type DebugMode = 'progress-bar' | 'consola' | 'hidden'
export type TranslateEngine = 'google' | 'deepl' | 'libre' | 'yandex'

export interface LocaleFile {
  path: string
  langCode: string
  dir: string
}

export enum FileExtensions {
  YML = 'yml',
  YAML = 'yaml',
  TS = 'ts',
  JSON = 'json',
}
