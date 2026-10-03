import { describe, it, expect } from 'vitest'
import type { Cookie } from '#cookie-control/types'
import { cookieGroups } from '~/utils/cookieGroups'

const category = (id: string): Cookie => ({ id, name: `cookies.${id}`, description: `cookies.${id}_description`, targetCookieIds: [] })

/** The platform's configuration (`cookieControl` in nuxt.config.ts). */
const PLATFORM = {
  necessary: ['n', 'functionality_storage'].map(category),
  optional: ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage', 'personalization_storage', 'security_storage'].map(category),
}

describe('cookieGroups', () => {
  it('folds the consent-mode categories into the groups a shopper reads, necessary ones locked', () => {
    expect(cookieGroups(PLATFORM).map(group => [group.key, group.ids, group.locked])).toEqual([
      ['necessary', ['n'], true],
      ['functionality', ['functionality_storage'], true],
      ['analytics', ['analytics_storage'], false],
      ['advertising', ['ad_storage', 'ad_user_data', 'ad_personalization'], false],
      ['personalization', ['personalization_storage'], false],
      ['security', ['security_storage'], false],
    ])
  })

  it('leaves out a group with nothing configured, and keeps only the configured ids of a group', () => {
    const groups = cookieGroups({ necessary: [category('n')], optional: [category('ad_storage')] })

    expect(groups.map(group => [group.key, group.ids])).toEqual([['necessary', ['n']], ['advertising', ['ad_storage']]])
  })

  it('gives a category no group names a row of its own, so none is hidden', () => {
    const extra = category('chat_storage')

    const [, , row] = cookieGroups({ necessary: [category('n')], optional: [category('analytics_storage'), extra] })

    expect(row).toEqual({ key: 'chat_storage', ids: ['chat_storage'], locked: false, cookie: extra })
  })
})
