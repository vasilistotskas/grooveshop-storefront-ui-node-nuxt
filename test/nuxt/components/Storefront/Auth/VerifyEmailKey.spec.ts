import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import VerifyEmailKey from '~/components/Storefront/Auth/VerifyEmailKey.vue'
import WebsideVerifyEmailKey from '~/components/variants/webside/Storefront/Auth/VerifyEmailKey.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Confirming the email from the emailed link (`useVerifyEmailKey`, shared
 * by both trees): the link's key is looked up first, a valid one asks the
 * shopper to confirm, and confirming toasts and goes to the account. A
 * link opened on another device is answered 401 (confirmed, no pending
 * session), which counts as confirmed.
 */
const { getEmailVerify, emailVerify, toastAdd } = vi.hoisted(() => ({
  getEmailVerify: vi.fn((_key: string) => Promise.resolve<unknown>({ status: 200, data: { email: 'shopper@example.com', user: { id: 7, display: 'Shopper', username: 'shopper' } } })),
  emailVerify: vi.fn((_body: { key: string }) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getEmailVerify, emailVerify }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const { headSpy } = vi.hoisted(() => ({ headSpy: vi.fn() }))
mockNuxtImport('useHead', original => (input: Parameters<typeof original>[0]) => {
  headSpy(input)
  return original(input)
})

/** Each tree's own `<i18n>` copy (el). */
const COPY = {
  default: { confirm: 'Επιβεβαίωση email', confirmed: 'Το email σου επιβεβαιώθηκε.', invalid: 'Αυτός ο σύνδεσμος δεν ισχύει πια', title: 'Επιβεβαίωσε το email σου' },
  webside: { confirm: 'Επιβεβαίωση email', confirmed: 'Το email σας επιβεβαιώθηκε επιτυχώς!', invalid: 'Μη έγκυρος σύνδεσμος', title: 'Επιβεβαίωση διεύθυνσης ηλεκτρονικού ταχυδρομείου' },
}

beforeEach(() => {
  clearNuxtData('verifyEmail')
})

describe.each(trees(VerifyEmailKey, WebsideVerifyEmailKey))('$tree Storefront/Auth/VerifyEmailKey', ({ tree, C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/verify-email/abc-123' })
  const confirmButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(button => button.text() === 'Επιβεβαίωση email' || button.text() === 'Επιβεβαίωση')!

  it('titles the document', async () => {
    await mountPage()

    expect(headSpy.mock.calls.map(([input]) => toValue(input.title))).toContain(COPY[tree].title)
  })

  it('looks the link\'s key up and shows the address to confirm', async () => {
    const wrapper = await mountPage()

    expect(getEmailVerify).toHaveBeenCalledWith('abc-123')
    expect(wrapper.text()).toContain('shopper@example.com')
  })

  it('confirms the address, toasts and goes to the account', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    const wrapper = await mountPage()

    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()

    expect(emailVerify).toHaveBeenCalledExactlyOnceWith({ key: 'abc-123' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('auth.email.verified'),
      description: COPY[tree].confirmed,
      color: 'success',
    }))
    expect(push).toHaveBeenCalledExactlyOnceWith(useLocalePath()('account'))
  })

  it('counts allauth\'s 401 (confirmed on another device) as confirmed', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    emailVerify.mockRejectedValue({ data: { statusCode: 401, data: { status: 401, data: { flows: [] }, meta: { is_authenticated: false } } } })
    const wrapper = await mountPage()

    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ description: COPY[tree].confirmed, color: 'success' }))
    expect(push).toHaveBeenCalledExactlyOnceWith(useLocalePath()('account'))
  })

  it('shows what allauth refused and stays', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    emailVerify.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid', param: 'key', message: 'Ο σύνδεσμος δεν ισχύει.' })))
    const wrapper = await mountPage()

    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(push).not.toHaveBeenCalled()
  })

  it('says the link is no longer valid when allauth does not know its key', async () => {
    getEmailVerify.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid', param: 'key', message: 'Invalid key.' })))

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(COPY[tree].invalid)
    expect(confirmButton(wrapper)).toBeUndefined()
  })
})
