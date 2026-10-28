import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import AuthSettingsNavigation from '~/components/variants/webside/Account/AuthSettingsNavigation.vue'

/**
 * The settings menu beside webside's profile, Security and privacy pages:
 * three entries, Security among them, active on its own page and on every
 * page reached from it (`isSecurityPage`, the rule the default design's
 * navigation uses too).
 */
const state = vi.hoisted(() => ({ route: 'account-security___el' }))
mockNuxtImport('useRoute', () => () => ({ name: state.route, path: '/', fullPath: '/', params: {}, query: {}, hash: '', meta: {}, matched: [] }))

async function menu(route: string) {
  state.route = `${route}___el`
  const wrapper = await mountSuspended(AuthSettingsNavigation, { route: false })
  return wrapper.get('nav').findAll('a').map(link => ({ label: link.text(), href: link.attributes('href'), current: link.attributes('aria-current') === 'page' }))
}

describe('webside Account/AuthSettingsNavigation', () => {
  it('links the profile, Security and privacy pages', async () => {
    expect((await menu('account-settings')).map(({ label, href }) => ({ label, href }))).toEqual([
      { label: 'Προφίλ', href: '/account/settings' },
      { label: 'Ασφάλεια', href: '/account/security' },
      { label: 'Απόρρητο & Δεδομένα', href: '/account/settings/privacy' },
    ])
  })

  it.each([
    ['account-settings', 'Προφίλ'],
    ['account-settings-privacy', 'Απόρρητο & Δεδομένα'],
    ['account-security', 'Ασφάλεια'],
    ['account-sessions', 'Ασφάλεια'],
    ['account-password-change', 'Ασφάλεια'],
    ['account-2fa-totp-activate', 'Ασφάλεια'],
    ['account-2fa-recovery-codes', 'Ασφάλεια'],
  ])('marks the entry for %s as the current one', async (route, label) => {
    const links = await menu(route)

    expect(links.filter(link => link.current).map(link => link.label)).toEqual([label])
  })
})
