/**
 * Reading helper for the sign-in pages' ink panel Django serves typed on
 * `GET /settings/public` (`AuthPanel`, generated).
 *
 * `tagline` carries the DEFAULT locale's wording and `i18n` overrides it
 * per locale; the photo is not translatable, so it is not an override key.
 */

/** The line for `locale`, falling back to the default locale's. */
export function authPanelTagline(panel: AuthPanel, locale: string): string {
  return panel.i18n?.[locale]?.tagline || panel.tagline || ''
}
