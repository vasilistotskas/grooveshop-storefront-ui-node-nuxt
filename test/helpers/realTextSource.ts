import { join } from 'node:path'
import { LOCALE_FILES, LOCALE_FILES_DIR } from '../../i18n/locales.ts'
import type { TextCatalogueSource } from '../../modules/text-catalogue/extract.ts'
import { APP, COMPONENTS, FROZEN, FROZEN_PREFIX, REPO } from './sourceText.ts'

/**
 * The text catalogue's source for the REAL app tree. `componentDirs` is
 * `nuxt.config.ts`'s `components` option (the frozen tree first, with its
 * `Webside` prefix, then everything else); the module reads the option
 * itself, and `reachability.spec.ts` checks this copy against the config.
 */
export const REAL_TEXT_SOURCE: TextCatalogueSource = {
  appDir: APP,
  localesDir: join(REPO, LOCALE_FILES_DIR),
  localeFiles: LOCALE_FILES,
  componentDirs: [
    { path: FROZEN, prefix: FROZEN_PREFIX },
    { path: COMPONENTS, prefix: '' },
  ],
}
