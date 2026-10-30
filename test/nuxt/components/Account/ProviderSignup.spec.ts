import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ProviderSignup from '~/components/Account/ProviderSignup.vue'
import WebsideProviderSignup from '~/components/variants/webside/Account/ProviderSignup.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * The last step of signing up through a social provider: the email the
 * account will use (`useProviderSignup`, shared by both trees). Mocked at
 * `useAllAuthAuthentication`; where the shopper goes afterwards is the
 * auth plugin's `auth:change` chain.
 */
const { providerSignup, toastAdd } = vi.hoisted(() => ({
  providerSignup: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ providerSignup }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  providerSignup.mockResolvedValue({ status: 200 })
})

async function submit(wrapper: VueWrapper, email: string, { acceptTerms = true } = {}) {
  await wrapper.find('input[type="email"]').setValue(email)
  if (acceptTerms) await wrapper.find('button[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(ProviderSignup, WebsideProviderSignup))('$tree Account/ProviderSignup', ({ C }) => {
  const mountForm = () => mountSuspended(C, { route: false })

  // Both trees ask for the terms before an account is made through a provider,
  // as the email sign-up does.
  it('holds the submit button until the terms are accepted', async () => {
    const wrapper = await mountForm()
    const submitButton = () => wrapper.find('button[type="submit"]')

    expect(submitButton().attributes('disabled')).toBeDefined()

    await wrapper.find('button[role="checkbox"]').trigger('click')

    expect(submitButton().attributes('disabled')).toBeUndefined()
  })

  it('makes no account without the terms, even when the form is submitted past the disabled button', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com', { acceptTerms: false })

    expect(providerSignup).not.toHaveBeenCalled()
    expect(wrapper.emitted('providerSignup')).toBeUndefined()
  })

  it('gives allauth the email, says the account is made and tells its parent', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(providerSignup).toHaveBeenCalledExactlyOnceWith({ email: 'new@example.com' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('providerSignup')).toHaveLength(1)
  })

  it('refuses an address that is not an email without asking allauth', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'not-an-email')

    expect(providerSignup).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
  })

  it('says what allauth refused and does not report the account as made', async () => {
    providerSignup.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'email_taken', param: 'email', message: 'Υπάρχει ήδη χρήστης με αυτή τη διεύθυνση email.' })))
    const wrapper = await mountForm()

    await submit(wrapper, 'taken@example.com')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('providerSignup')).toBeUndefined()
  })
})
