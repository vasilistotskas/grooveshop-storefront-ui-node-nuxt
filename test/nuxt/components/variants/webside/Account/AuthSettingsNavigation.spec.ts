import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import AuthSettingsNavigation from '~/components/variants/webside/Account/AuthSettingsNavigation.vue'

/**
 * The settings menu beside webside's profile, Security and privacy pages:
 * three entries, Security among them, active on its own page and on every
 * page reached from it (`isSecurityPage`, the rule the default design's
 * navigation uses too).
 */
const state = vi.hoisted(() => ({ route: 'account-security___el', path: '/account/security' }))
mockNuxtImport('useRoute', () => () => ({ name: state.route, path: state.path, fullPath: state.path, params: {}, query: {}, hash: '', meta: {}, matched: [] }))

async function menu(route: string, path = '/') {
  state.route = `${route}___el`
  state.path = path
  const wrapper = await mountSuspended(AuthSettingsNavigation, { route: false })
  return wrapper.get('nav').findAll('a').map(link => ({ label: link.text(), href: link.attributes('href'), current: link.attributes('aria-current') }))
}

describe('webside Account/AuthSettingsNavigation', () => {
  it('links the profile, Security and privacy pages', async () => {
    expect((await menu('account-settings')).map(({ label, href }) => ({ label, href }))).toEqual([
      { label: 'Προφίλ', href: '/account/settings' },
      { label: 'Ασφάλεια', href: '/account/security' },
      { label: 'Απόρρητο & Δεδομένα', href: '/account/settings/privacy' },
    ])
  })

  // Its own page is the page; a page reached from Security is the
  // shopper's location within it (`currentMark`).
  it.each([
    ['account-settings', '/account/settings', 'Προφίλ', 'page'],
    ['account-settings-privacy', '/account/settings/privacy', 'Απόρρητο & Δεδομένα', 'page'],
    ['account-security', '/account/security', 'Ασφάλεια', 'page'],
    ['account-sessions', '/account/sessions', 'Ασφάλεια', 'location'],
    ['account-password-change', '/account/password/change', 'Ασφάλεια', 'location'],
    ['account-2fa-totp-activate', '/account/2fa/totp/activate', 'Ασφάλεια', 'location'],
    ['account-2fa-recovery-codes', '/account/2fa/recovery-codes', 'Ασφάλεια', 'location'],
  ])('marks the entry for %s as the current one', async (route, path, label, mark) => {
    const links = await menu(route, path)

    expect(links.filter(link => link.current).map(link => [link.label, link.current])).toEqual([[label, mark]])
  })
})
