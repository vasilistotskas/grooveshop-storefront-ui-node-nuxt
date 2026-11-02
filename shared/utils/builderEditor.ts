import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { BUILDER_EDITOR_ROUTE } from '../constants/builderEditor'

/**
 * Whether a path is the page editor's own page, in any language
 * (`/_builder`, `/en/_builder`). The editor is not the store: it is drawn
 * in the platform's look, so the store's design, theme tokens and font
 * faces stay off it (`app/plugins/design.ts`, `app/plugins/tenant-theme.ts`,
 * `server/plugins/tenant-theme.ts`, `server/plugins/tenant-fonts.ts`). The
 * store itself is what its preview frame shows.
 */
export function isBuilderEditorPath(path: string): boolean {
  return splitLocale(path.split('?')[0] ?? '').route === BUILDER_EDITOR_ROUTE
}
