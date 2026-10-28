import { fileURLToPath } from 'node:url'
import type { TextCatalogueSource } from '../../../modules/text-catalogue/extract.ts'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

/**
 * A small app tree in the shape of the real one: component blocks (named,
 * list, linked and plural messages, an array item, a flag that is not a
 * message, a key only one locale has), the Omnibus label in the default and
 * a tenant tree, a cookie dialog, and global locale files including
 * validation and error codes.
 *
 * Its registries (`app/utils/*Registry.ts`) give two stores a design of
 * their own: `webside` (a frozen tree under the `Webside` prefix: footer
 * and home page) and `delta_sigma` (one page-builder section variant).
 */
export const TEXT_FIXTURE_SOURCE: TextCatalogueSource = {
  appDir: path('./app'),
  localesDir: path('./locales'),
  localeFiles: {
    el: ['el-GR.json', 'validation/el-GR.json'],
    en: ['en-US.json', 'validation/en-US.json'],
  },
  componentDirs: [
    { path: path('./app/components/variants/webside'), prefix: 'Webside' },
    { path: path('./app/components'), prefix: '' },
  ],
}
