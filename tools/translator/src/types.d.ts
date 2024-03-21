/* eslint-disable no-console */
export type debugMode = 'progress-bar' | 'consola' | 'hidden'
export type translateEngine = 'google' | 'deepl' | 'libre' | 'yandex'

export interface LocaleFile {
  path: string
  lang: string
  dir: string
}
