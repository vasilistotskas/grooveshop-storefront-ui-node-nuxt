import type { Cookie } from '#cookie-control/types'

/**
 * The cookie preferences as a shopper reads them: a handful of plain
 * groups ("Advertising") instead of the consent-mode categories they
 * stand for (`ad_storage`, `ad_user_data`, `ad_personalization`).
 *
 * Grouping is presentation only. The categories, and which of them are
 * necessary, are `cookieControl` in nuxt.config.ts, which webside's
 * banner reads too.
 */
export interface CookieGroup {
  /** The group's i18n key, or the category's own id for an ungrouped one. */
  key: string
  /** The category ids one switch sets. */
  ids: string[]
  /** Every category in it is necessary: on in any decision, never switched. */
  locked: boolean
  /** A category no group names, labelled by its own `name`/`description` keys. */
  cookie?: Cookie
}

const GROUPS: readonly { key: string, ids: readonly string[] }[] = [
  { key: 'necessary', ids: ['n'] },
  { key: 'functionality', ids: ['functionality_storage'] },
  { key: 'analytics', ids: ['analytics_storage'] },
  { key: 'advertising', ids: ['ad_storage', 'ad_user_data', 'ad_personalization'] },
  { key: 'personalization', ids: ['personalization_storage'] },
  { key: 'security', ids: ['security_storage'] },
]

/**
 * The groups the configured categories fall into, in order. A group
 * with no configured category is left out; a configured category no
 * group names gets a row of its own, so the configuration never holds a
 * category the shopper cannot see.
 */
export function cookieGroups(cookies: { necessary: readonly Cookie[], optional: readonly Cookie[] }): CookieGroup[] {
  const necessaryIds = new Set(cookies.necessary.map(cookie => cookie.id))
  const configured = [...cookies.necessary, ...cookies.optional]
  const configuredIds = new Set(configured.map(cookie => cookie.id))
  const grouped = new Set(GROUPS.flatMap(group => group.ids))

  return [
    ...GROUPS
      .map(group => ({ key: group.key, ids: group.ids.filter(id => configuredIds.has(id)) }))
      .filter(group => group.ids.length > 0)
      .map(group => ({ ...group, locked: group.ids.every(id => necessaryIds.has(id)) })),
    ...configured
      .filter(cookie => !grouped.has(cookie.id))
      .map(cookie => ({ key: cookie.id, ids: [cookie.id], locked: necessaryIds.has(cookie.id), cookie })),
  ]
}
