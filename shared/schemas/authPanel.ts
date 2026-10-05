/**
 * Render-time contract for the ``AUTH_PANEL`` extra_setting: the photo
 * and the line on the sign-in pages' ink panel.
 *
 * Write-side mirror: ``tenant/validators.py::validate_auth_panel_setting``
 * in the Django repo — keep the two in sync.
 *
 * Deliberately ZOD-FREE, like ``shared/schemas/announcementBar.ts``: the
 * layout is read on every sign-in page, so a zod import would join its
 * critical JS graph.
 *
 * ``tagline`` carries the DEFAULT locale's wording and ``i18n`` overrides
 * it per locale; the photo is not translatable, so it is not an override
 * key. ``imageUrl`` is a bare stored media path, the same string every
 * page-section image prop holds.
 */

export interface AuthPanel {
  imageUrl?: string
  tagline?: string
  i18n?: Record<string, { tagline: string }>
}

const ALLOWED_KEYS = new Set(['imageUrl', 'tagline', 'i18n'])
const TAGLINE_MAX = 200
const IMAGE_MAX = 1000

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

export function isAuthPanel(value: unknown): value is AuthPanel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !ALLOWED_KEYS.has(key))) return false

  if (data.imageUrl !== undefined && !isBoundedString(data.imageUrl, IMAGE_MAX)) {
    return false
  }
  if (data.tagline !== undefined && !isBoundedString(data.tagline, TAGLINE_MAX)) {
    return false
  }

  if (data.i18n !== undefined) {
    if (!data.i18n || typeof data.i18n !== 'object' || Array.isArray(data.i18n)) {
      return false
    }
    for (const override of Object.values(data.i18n as Record<string, unknown>)) {
      if (!override || typeof override !== 'object' || Array.isArray(override)) {
        return false
      }
      const entry = override as Record<string, unknown>
      if (Object.keys(entry).length !== 1) return false
      if (!isBoundedString(entry.tagline, TAGLINE_MAX)) return false
    }
  }

  return true
}

/**
 * Parse the raw setting string. ``null`` for anything unusable — empty,
 * malformed JSON, or a shape the guard rejects — so the panel keeps its
 * plain ink-and-logo look.
 */
export function parseAuthPanelValue(raw: string): AuthPanel | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return null
  }
  return isAuthPanel(parsed) ? parsed : null
}

/** The line for ``locale``, falling back to the default locale's. */
export function authPanelTagline(panel: AuthPanel, locale: string): string {
  return panel.i18n?.[locale]?.tagline || panel.tagline || ''
}
