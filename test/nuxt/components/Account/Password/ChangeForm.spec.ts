import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ChangeForm from '~/components/Account/Password/ChangeForm.vue'
import type { SessionResponse } from '~~/shared/types/response/all-auth/auth/session'

/**
 * Changing — or, for an account created through a social provider,
 * first setting — the password. Whether the account has a usable
 * password is the session's `has_usable_password`, read through the auth
 * store; mocked at `useAllAuthAccount`.
 */
const { changePassword, navigateToMock, toastAdd } = vi.hoisted(() => ({
  changePassword: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ changePassword }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

function signIn(hasUsablePassword: boolean) {
  const session: SessionResponse['data'] = {
    user: { id: 7, display: 'Shopper', email: 'shopper@example.com', has_usable_password: hasUsablePassword },
    methods: [],
  }
  useAuthStore().session = session
}

beforeEach(() => {
  signIn(true)
})

const mountForm = () => mountSuspended(ChangeForm, { route: false })

async function fill(wrapper: VueWrapper, fields: { current?: string, next: string, confirm?: string }) {
  if (fields.current !== undefined) await wrapper.find('input[autocomplete="current-password"]').setValue(fields.current)
  const [next, confirm] = wrapper.findAll('input[autocomplete="new-password"]')
  await next!.setValue(fields.next)
  await confirm!.setValue(fields.confirm ?? fields.next)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Account/Password/ChangeForm', () => {
  it('changes the password with the current one, then returns to the account', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { current: 'Παλιός2023', next: 'Καλημέρα2024' })

    expect(changePassword).toHaveBeenCalledWith({ current_password: 'Παλιός2023', new_password: 'Καλημέρα2024' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('auth.password.change.success'),
      color: 'success',
    }))
    expect(wrapper.emitted('changePassword')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account'))
  })

  it.each([
    ['the current password is missing', { current: '', next: 'Καλημέρα2024' }, () => useNuxtApp().$i18n.t('validation.required')],
    ['the new password is the current one', { current: 'Καλημέρα2024', next: 'Καλημέρα2024' }, () => useNuxtApp().$i18n.t('validation.password.must_not_be_same')],
    ['the confirmation differs', { current: 'Παλιός2023', next: 'Καλημέρα2024', confirm: 'Καλημέρα2025' }, () => {
      const { t } = useNuxtApp().$i18n
      return t('validation.must_match', { field: t('password.new'), other: t('password.confirm') })
    }],
    ['the new password is all digits', { current: 'Παλιός2023', next: '12345678' }, () => useNuxtApp().$i18n.t('validation.password.entirely_numeric')],
  ])('refuses when %s', async (_case, fields, message) => {
    const wrapper = await mountForm()

    await fill(wrapper, fields)

    expect(wrapper.text()).toContain(message())
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('lets an account without a password set one, with no current-password field', async () => {
    signIn(false)
    const wrapper = await mountForm()

    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(true)

    await fill(wrapper, { next: 'Καλημέρα2024' })

    expect(changePassword).toHaveBeenCalledWith({ current_password: '', new_password: 'Καλημέρα2024' })
  })

  it('shows what allauth rejected and stays on the form', async () => {
    changePassword.mockRejectedValue({
      data: { statusCode: 400, data: { status: 400, errors: [{ code: 'enter_current_password', param: 'current_password', message: 'Please type your current password.' }] } },
    })
    const wrapper = await mountForm()

    await fill(wrapper, { current: 'Λάθος2023', next: 'Καλημέρα2024' })

    const { t, te } = useNuxtApp().$i18n
    expect(toastAdd).toHaveBeenCalledWith({
      title: te('validation.api.enter_current_password') ? t('validation.api.enter_current_password') : 'Please type your current password.',
      color: 'error',
    })
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('cancels back to the account', async () => {
    const wrapper = await mountForm()

    const cancel = wrapper.findAll('button').find(button => button.text() === 'Ακύρωση')
    await cancel!.trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account'))
    expect(changePassword).not.toHaveBeenCalled()
  })
})
