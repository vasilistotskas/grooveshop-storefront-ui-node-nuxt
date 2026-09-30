import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Generate from '~/components/Account/2Fa/RecoveryCodes/Generate.vue'

/**
 * Generating a new set of recovery codes cancels every code the shopper
 * still has, so with codes left the button waits for an explicit
 * confirmation. Mocked at `useAllAuthAccount`.
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

async function mountGenerate() {
  const wrapper = await mountSuspended(Generate, { route: false })
  await flushPromises()
  return wrapper
}

const generateButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(button => button.text() === 'Δημιουργία Κωδικών')!

describe('Account/2Fa/RecoveryCodes/Generate', () => {
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
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Επιτυχής δημιουργία κωδικών', color: 'success' }))
    expect(wrapper.emitted('generateRecoveryCodes')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-2fa-recovery-codes'))
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
    generateRecoveryCodes.mockRejectedValue(new Error('Bad Gateway'))
    getRecoveryCodes.mockResolvedValue(codesLeft(0))
    const wrapper = await mountGenerate()

    await generateButton(wrapper).trigger('click')
    await flushPromises()

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('generateRecoveryCodes')).toBeUndefined()
  })

  it('cancels back to the codes', async () => {
    const wrapper = await mountGenerate()

    await wrapper.findAll('button').find(button => button.text() === useNuxtApp().$i18n.t('cancel'))!.trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-2fa-recovery-codes'))
    expect(generateRecoveryCodes).not.toHaveBeenCalled()
  })

  it('sends a shopper without two-factor set up back to the settings', async () => {
    getRecoveryCodes.mockRejectedValue(new Error('Not Found'))

    await mountGenerate()

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('auth.mfa.required'), color: 'error' })
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-settings'))
  })
})
