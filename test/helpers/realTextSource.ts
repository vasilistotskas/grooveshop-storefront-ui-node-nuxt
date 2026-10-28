import { join } from 'node:path'
import { LOCALE_FILES, LOCALE_FILES_DIR } from '../../i18n/locales.ts'
import type { TextCatalogueSource } from '../../modules/text-catalogue/extract.ts'
import { APP, COMPONENTS, WEBSIDE_DESIGN, WEBSIDE_DESIGN_PREFIX, REPO } from './sourceText.ts'

/**
 * The text catalogue's source for the REAL app tree. `componentDirs` is
 * `nuxt.config.ts`'s `components` option (the webside design first, with its
 * `Webside` prefix, then everything else); the module reads the option
 * itself, and `reachability.spec.ts` checks this copy against the config.
 */
export const REAL_TEXT_SOURCE: TextCatalogueSource = {
  appDir: APP,
  localesDir: join(REPO, LOCALE_FILES_DIR),
  localeFiles: LOCALE_FILES,
  componentDirs: [
    { path: WEBSIDE_DESIGN, prefix: WEBSIDE_DESIGN_PREFIX },
    { path: COMPONENTS, prefix: '' },
  ],
}
