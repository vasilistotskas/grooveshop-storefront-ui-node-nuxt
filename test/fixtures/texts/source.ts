import { fileURLToPath } from 'node:url'
import type { TextCatalogueSource } from '../../../modules/text-catalogue/extract.ts'

/**
 * A small app tree in the shape of the real one: component blocks (named,
 * list, linked and plural messages, an array item, a flag that is not a
 * message, a key only one locale has), the Omnibus label in the default and
 * a tenant tree, a cookie dialog, and global locale files including
 * validation and error codes.
 */
export const TEXT_FIXTURE_SOURCE: TextCatalogueSource = {
  appDir: fileURLToPath(new URL('./app', import.meta.url)),
  localesDir: fileURLToPath(new URL('./locales', import.meta.url)),
  localeFiles: {
    el: ['el-GR.json', 'validation/el-GR.json'],
    en: ['en-US.json', 'validation/en-US.json'],
  },
}
