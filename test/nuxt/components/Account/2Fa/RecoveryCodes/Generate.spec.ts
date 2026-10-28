import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Generate from '~/components/Account/2Fa/RecoveryCodes/Generate.vue'
import WebsideGenerate from '~/components/variants/webside/Account/2Fa/RecoveryCodes/Generate.vue'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * Generating a new set of recovery codes cancels every code the shopper
 * still has, so with codes left the button waits for an explicit
 * confirmation (`useRecoveryCodesRegeneration`, shared by both trees). A
 * shopper without two-step verification goes back to the Security page.
 * Mocked at `useAllAuthAccount`.
 */
const { getRecoveryCodes, generateRecoveryCodes, navigateToMock, toastAdd } = vi.hoisted(() => ({
  getRecoveryCodes: vi.fn(),
  generateRecoveryCodes: vi.fn(() => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ getRecoveryCodes, generateRecoveryCodes }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const codesLeft = (n: number) => ({ status: 200, data: { type: 'recovery_codes', created_at: 0, last_used_at: null, total_code_count: 10, unused_code_count: n } })

beforeEach(() => {
  clearNuxtData('recoveryCodes')
  getRecoveryCodes.mockResolvedValue(codesLeft(5))
})

const COPY = {
  default: {
    ...inlineCopy('app/components/Account/2Fa/RecoveryCodes/Generate.vue'),
    action: { generate: 'Δημιουργία κωδικών' },
    toast: { success: { title: 'Οι νέοι κωδικοί δημιουργήθηκαν. Φύλαξέ τους τώρα.' } },
  },
  webside: inlineCopy('app/components/variants/webside/Account/2Fa/RecoveryCodes/Generate.vue'),
}

describe.each(trees(Generate, WebsideGenerate))('$tree Account/2Fa/RecoveryCodes/Generate', ({ tree, C }) => {
  const copyOf = COPY[tree]
  const SECURITY = 'account-security'

  async function mountGenerate() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  const generateButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(button => button.text() === copyOf.action.generate)!

  it('waits for the shopper to confirm cancelling the codes left', async () => {
    const wrapper = await mountGenerate()

    expect(generateButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('button[role="checkbox"]').trigger('click')
    expect(generateButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('generates the codes once confirmed, then shows them', async () => {
    const wrapper = await mountGenerate()

    await wrapper.find('button[role="checkbox"]').trigger('click')
    await generateButton(wrapper).trigger('click')
    await flushPromises()

    expect(generateRecoveryCodes).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: copyOf.toast.success.title, color: 'success' }))
    expect(navigateToMock).toHaveBeenCalledExactlyOnceWith(useLocalePath()('account-2fa-recovery-codes'))
  })

  it('does not generate while the confirmation is missing', async () => {
    const wrapper = await mountGenerate()

    await generateButton(wrapper).trigger('click')
    await flushPromises()

    expect(generateRecoveryCodes).not.toHaveBeenCalled()
  })

  it('warns how many codes the new set cancels', async () => {
    const wrapper = await mountGenerate()

    expect(wrapper.findComponent({ name: 'UAlert' }).text()).toContain(tree === 'default' ? 'Σου απομένουν 5 κωδικοί' : 'Έχεις 5 διαθέσιμους κωδικούς')
  })

  it('needs no confirmation when no codes are left', async () => {
    getRecoveryCodes.mockResolvedValue(codesLeft(0))
    const wrapper = await mountGenerate()

    expect(wrapper.find('button[role="checkbox"]').exists()).toBe(false)
    await generateButton(wrapper).trigger('click')
    await flushPromises()

    expect(generateRecoveryCodes).toHaveBeenCalledTimes(1)
  })

  it('stays put when generating fails', async () => {
    generateRecoveryCodes.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'reauthentication_required', message: 'Please reauthenticate.' })))
    getRecoveryCodes.mockResolvedValue(codesLeft(0))
    const wrapper = await mountGenerate()

    await generateButton(wrapper).trigger('click')
    await flushPromises()

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it.runIf(tree === 'default')('cancels back to the codes left', async () => {
    const wrapper = await mountGenerate()

    expect(wrapper.findAll('a').find(link => link.text() === 'Άκυρο')!.attributes('href')).toBe('/account/2fa/recovery-codes')
  })

  it.runIf(tree === 'default')('cancels back to Security when there are no codes to go back to', async () => {
    getRecoveryCodes.mockResolvedValue(codesLeft(0))
    const wrapper = await mountGenerate()

    expect(wrapper.findAll('a').find(link => link.text() === 'Άκυρο')!.attributes('href')).toBe('/account/security')
  })

  it('sends a shopper without two-factor set up back to where it is set up', async () => {
    getRecoveryCodes.mockRejectedValue(new Error('Not Found'))

    await mountGenerate()

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('auth.mfa.required'), color: 'error' })
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()(SECURITY))
  })
})
