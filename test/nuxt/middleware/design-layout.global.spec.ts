import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import designLayout from '~/middleware/design-layout.global'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Page files fix their layout at build time; this middleware swaps in the
 * layout a store's design draws a kind of page in. Volt stores get the
 * split sign-in layout on every sign-in, sign-up and re-authentication
 * page, in every locale; webside keeps the layout its page file names.
 */
const { setPageLayoutMock } = vi.hoisted(() => ({ setPageLayoutMock: vi.fn() }))
mockNuxtImport('setPageLayout', () => setPageLayoutMock)

const visit = (path: string) => {
  const to = useRouter().resolve(path)
  return designLayout(to, to)
}

describe('design-layout middleware', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'demo' })
  })

  it.each([
    ['account-login'],
    ['account-signup'],
    ['account-2fa-authenticate-totp'],
    ['account-2fa-reauthenticate-webauthn'],
  ] as const)('frames %s in the split layout for a Volt store', async (name) => {
    await visit(useLocalePath()(name))

    expect(setPageLayoutMock).toHaveBeenCalledExactlyOnceWith('auth-split')
  })

  it('frames the English page the same way', async () => {
    await visit(useLocalePath()('account-login', 'en'))

    expect(setPageLayoutMock).toHaveBeenCalledExactlyOnceWith('auth-split')
  })

  it('leaves every other page in its own layout', async () => {
    await visit(useLocalePath()('account-orders'))
    await visit(useLocalePath()('index'))

    expect(setPageLayoutMock).not.toHaveBeenCalled()
  })

  it('leaves webside on the layout its frozen sign-in pages were captured in', async () => {
    setTenant({ schemaName: 'webside' })

    await visit(useLocalePath()('account-login'))

    expect(setPageLayoutMock).not.toHaveBeenCalled()
  })
})
