/**
 * Reading helpers for the announcement bar Django serves typed on
 * `GET /settings/public` (`AnnouncementBar`, generated). Django validates
 * the setting when it is written, so the storefront parses nothing.
 *
 * `text` carries the DEFAULT locale's wording and `i18n` overrides it per
 * locale. `shortText` is the phone's copy and `code` a promo code set
 * apart from the sentence; the code is the same string in every language,
 * so it is not a per-locale key.
 */

/** The wording for `locale`, falling back to the default one's. */
export function announcementText(
  bar: AnnouncementBar,
  locale: string,
): string {
  return bar.i18n?.[locale]?.text || bar.text
}

/**
 * The phone's wording for `locale`, or `''` when the bar has none.
 * A locale that has an override never borrows the default locale's
 * `shortText`: that is another language, so the phone shows the
 * locale's full `text` instead.
 */
export function announcementShortText(
  bar: AnnouncementBar,
  locale: string,
): string {
  const override = bar.i18n?.[locale]
  return (override ? override.shortText : bar.shortText) || ''
}
