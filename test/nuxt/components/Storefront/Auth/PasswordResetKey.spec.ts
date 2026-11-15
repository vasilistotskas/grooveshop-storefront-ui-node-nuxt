import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import PasswordResetKey from '~/components/Storefront/Auth/PasswordResetKey.vue'
import WebsidePasswordResetKey from '~/components/variants/webside/Storefront/Auth/PasswordResetKey.vue'
import { trees } from '~~/test/helpers/trees'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The page behind the emailed reset link: it titles the document in both
 * trees (the form's own behaviour is `Account/Password/ResetConfirmForm`'s
 * spec).
 */
const { getPasswordReset } = vi.hoisted(() => ({
  getPasswordReset: vi.fn((_key: string) => Promise.resolve({ status: 200 })),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getPasswordReset, passwordReset: vi.fn() }))

/** Each tree's own `<i18n>` title (el). */
const TITLE = { default: 'Διάλεξε νέο κωδικό', webside: 'Επανέφερε τον κωδικό πρόσβασης' }

// A store with customer accounts: every page under /account names its gate (`customer-accounts-enabled`).
beforeEach(() => {
  setTenant()
})

describe.each(trees(PasswordResetKey, WebsidePasswordResetKey))('$tree Storefront/Auth/PasswordResetKey', ({ tree, C }) => {
  it('titles the document', async () => {
    await mountSuspended(C, { route: '/account/password/reset/key/abc-123' })

    await vi.waitFor(() => expect(document.title).toContain(TITLE[tree]))
  })
})
