/**
 * Render-time contract for the ``ANNOUNCEMENT_BAR`` extra_setting.
 *
 * Write-side mirror: ``tenant/validators.py::
 * validate_announcement_bar_setting`` in the Django repo — keep the two
 * in sync.
 *
 * Deliberately ZOD-FREE, for the same reason as
 * ``shared/schemas/businessHours.ts``: the bar sits above the header, so
 * every page reads this setting, and a zod import here would drag the
 * zod runtime into every page's critical JS graph.
 *
 * ``text`` carries the DEFAULT locale's wording and ``i18n`` overrides
 * it per locale — the same partial-override convention as
 * ``PageSection.i18n`` and ``STORE_OFFICES``, which is why the default
 * locale is not a valid key there. ``shortText`` is the phone's copy and
 * ``code`` a promo code set apart from the sentence; the code is the same
 * string in every language, so it is not a per-locale key.
 */

export const ANNOUNCEMENT_COLORS = [
  'primary',
  'secondary',
  'neutral',
  'info',
  'success',
  'warning',
  'error',
] as const

export type AnnouncementColor = (typeof ANNOUNCEMENT_COLORS)[number]

export interface AnnouncementBar {
  enabled: boolean
  text: string
  shortText?: string
  code?: string
  i18n?: Record<string, { text?: string, shortText?: string }>
  link?: string
  icon?: string
  color?: AnnouncementColor
  dismissible?: boolean
  id?: string
}

const ICON_RE = /^i-[a-z0-9:-]+$/
const LINK_RE = /^(\/|https:\/\/)/
// One token: a promo code is typed or copied, never read as a sentence.
const CODE_RE = /^\S{1,40}$/
const TEXT_LIMITS = { text: 200, shortText: 80 } as const
const ALLOWED_KEYS = new Set([
  'enabled',
  'text',
  'shortText',
  'code',
  'i18n',
  'link',
  'icon',
  'color',
  'dismissible',
  'id',
])

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

export function isAnnouncementBar(value: unknown): value is AnnouncementBar {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !ALLOWED_KEYS.has(key))) return false

  if (typeof data.enabled !== 'boolean') return false
  if (!isBoundedString(data.text, TEXT_LIMITS.text)) return false
  if (
    data.shortText !== undefined
    && !isBoundedString(data.shortText, TEXT_LIMITS.shortText)
  ) {
    return false
  }
  if (
    data.code !== undefined
    && (typeof data.code !== 'string' || !CODE_RE.test(data.code))
  ) {
    return false
  }
  // A bar with nothing to say is a blank strip above the header.
  if (data.enabled && !data.text.trim()) return false

  if (data.link !== undefined) {
    if (!isBoundedString(data.link, 1000)) return false
    if (data.link && !LINK_RE.test(data.link)) return false
  }
  if (data.icon !== undefined) {
    if (!isBoundedString(data.icon, 100)) return false
    if (data.icon && !ICON_RE.test(data.icon)) return false
  }
  if (
    data.color !== undefined
    && !ANNOUNCEMENT_COLORS.includes(data.color as AnnouncementColor)
  ) {
    return false
  }
  if (data.dismissible !== undefined && typeof data.dismissible !== 'boolean') {
    return false
  }
  if (data.id !== undefined && !isBoundedString(data.id, 64)) return false

  if (data.i18n !== undefined) {
    if (!data.i18n || typeof data.i18n !== 'object' || Array.isArray(data.i18n)) {
      return false
    }
    for (const override of Object.values(data.i18n as Record<string, unknown>)) {
      if (!override || typeof override !== 'object' || Array.isArray(override)) {
        return false
      }
      const entry = override as Record<string, unknown>
      const keys = Object.keys(entry)
      if (!keys.length) return false
      for (const key of keys) {
        if (!(key in TEXT_LIMITS)) return false
        if (!isBoundedString(entry[key], TEXT_LIMITS[key as keyof typeof TEXT_LIMITS])) {
          return false
        }
      }
    }
  }

  return true
}

/**
 * Parse the raw setting string. ``null`` for anything unusable — an
 * empty value, malformed JSON, or a shape the guard rejects — so every
 * consumer renders nothing rather than a half-built bar.
 */
export function parseAnnouncementBarValue(raw: string): AnnouncementBar | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return null
  }
  return isAnnouncementBar(parsed) ? parsed : null
}

/** The wording for ``locale``, falling back to the default one's. */
export function announcementText(
  bar: AnnouncementBar,
  locale: string,
): string {
  return bar.i18n?.[locale]?.text || bar.text
}

/**
 * The phone's wording for ``locale``, or ``''`` when the bar has none.
 * A locale that has an override never borrows the default locale's
 * ``shortText``: that is another language, so the phone shows the
 * locale's full ``text`` instead.
 */
export function announcementShortText(
  bar: AnnouncementBar,
  locale: string,
): string {
  const override = bar.i18n?.[locale]
  return (override ? override.shortText : bar.shortText) || ''
}
