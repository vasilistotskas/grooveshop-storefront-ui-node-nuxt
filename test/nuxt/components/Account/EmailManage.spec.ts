import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import EmailManage from '~/components/Account/EmailManage.vue'
import type { EmailAddress } from '~~/shared/types/model/all-auth'

/**
 * The account's email addresses, through allauth's `/account/email`:
 * add one, make one primary, remove one, ask for a verification mail.
 * The primary address can be neither removed nor made primary again, so
 * its menu offers only verification (or nothing once it is verified).
 * Mocked at `useAllAuthAccount`; the list is its `useAsyncData`
 * (`emailAddresses`), re-read after every change that alters it.
 */
const { getEmailAddresses, addEmailAddress, requestEmailVerification, removeEmailAddress, changePrimaryEmailAddress, toastAdd } = vi.hoisted(() => ({
  getEmailAddresses: vi.fn((): Promise<{ status: number, data: EmailAddress[] }> => Promise.resolve({ status: 200, data: [] })),
  addEmailAddress: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200 })),
  requestEmailVerification: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200 })),
  removeEmailAddress: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200 })),
  changePrimaryEmailAddress: vi.fn((_body: { email: string, primary: boolean }) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({
  getEmailAddresses,
  addEmailAddress,
  requestEmailVerification,
  removeEmailAddress,
  changePrimaryEmailAddress,
}))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const PRIMARY: EmailAddress = { email: 'shopper@example.com', primary: true, verified: true }
const WORK: EmailAddress = { email: 'work@example.com', primary: false, verified: true }
const NEW: EmailAddress = { email: 'new@example.com', primary: false, verified: false }

const REFUSED = {
  data: { statusCode: 400, data: { status: 400, errors: [{ code: 'email_taken', param: 'email', message: 'A user is already registered with this email address.' }] } },
}

beforeEach(() => {
  clearNuxtData('emailAddresses')
  getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW] })
})

async function mountEmails() {
  const wrapper = await mountSuspended(EmailManage, { route: false })
  // The table sits in `<ClientOnly>`.
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('tbody tr')
/** The dropdown menus in row order; a row with nothing to offer has none. */
const menus = (wrapper: VueWrapper) =>
  wrapper.findAllComponents({ name: 'UDropdownMenu' }).map(
    menu => menu.props('items')[0] as Array<{ label: string, onSelect: () => unknown }>,
  )
const labels = (items: Array<{ label: string }>) => items.map(item => item.label)
const item = (wrapper: VueWrapper, email: string, label: string) => {
  const index = rows(wrapper).findIndex(row => row.text().includes(email))
  // Only rows with a menu render one, and the primary+verified row does not.
  const withMenu = rows(wrapper).slice(0, index + 1).filter(row => row.findComponent({ name: 'UDropdownMenu' }).exists()).length - 1
  return menus(wrapper)[withMenu]!.find(entry => entry.label === label)!
}

const t = (key: string) => useNuxtApp().$i18n.t(key)

async function addAddress(wrapper: VueWrapper, email: string) {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Account/EmailManage', () => {
  it('lists every address with whether it is verified and primary', async () => {
    const wrapper = await mountEmails()

    const cells = rows(wrapper).map(row => row.findAll('td').map(cell => cell.html()))
    expect(rows(wrapper).map(row => row.find('td').text())).toEqual([PRIMARY.email, WORK.email, NEW.email])
    // [verified, primary] per row, as the check / cross icon of each cell.
    expect(cells.map(([, verified, primary]) => [verified!.includes('check-20-solid'), primary!.includes('check-20-solid')])).toEqual([
      [true, true],
      [true, false],
      [false, false],
    ])
  })

  it('offers each address only what applies to it', async () => {
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW, { email: 'old@example.com', primary: true, verified: false }] })
    const wrapper = await mountEmails()

    // The verified primary row has no menu at all.
    expect(menus(wrapper).map(labels)).toEqual([
      [t('email.mark_as_primary'), t('email.remove')],
      [t('email.mark_as_primary'), t('email.remove'), t('email.request_verification')],
      [t('email.request_verification')],
    ])
  })

  it('makes an address primary, then reads the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockClear()

    await item(wrapper, WORK.email, t('email.mark_as_primary')).onSelect()
    await flushPromises()

    expect(changePrimaryEmailAddress).toHaveBeenCalledWith({ email: WORK.email, primary: true })
    expect(getEmailAddresses).toHaveBeenCalledOnce()
    expect(toastAdd).toHaveBeenCalledWith({ title: t('email.marked_as_primary'), color: 'success' })
    expect(wrapper.emitted('changePrimaryEmailAddress')).toHaveLength(1)
  })

  it('removes an address and shows the list allauth has left', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, NEW] })

    await item(wrapper, WORK.email, t('email.remove')).onSelect()
    await flushPromises()

    expect(removeEmailAddress).toHaveBeenCalledWith({ email: WORK.email })
    expect(rows(wrapper).map(row => row.find('td').text())).toEqual([PRIMARY.email, NEW.email])
    expect(toastAdd).toHaveBeenCalledWith({ title: t('email.removed'), color: 'success' })
    expect(wrapper.emitted('removeEmailAddress')).toHaveLength(1)
  })

  it('asks for a verification mail without re-reading the list', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockClear()

    await item(wrapper, NEW.email, t('email.request_verification')).onSelect()
    await flushPromises()

    expect(requestEmailVerification).toHaveBeenCalledWith({ email: NEW.email })
    expect(getEmailAddresses).not.toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith({ title: t('email.verification_requested'), color: 'success' })
    expect(wrapper.emitted('requestEmailVerification')).toHaveLength(1)
  })

  it('adds an address, then reads the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW, { email: 'added@example.com', primary: false, verified: false }] })

    await addAddress(wrapper, 'added@example.com')

    expect(addEmailAddress).toHaveBeenCalledWith({ email: 'added@example.com' })
    expect(rows(wrapper).map(row => row.find('td').text())).toContain('added@example.com')
    expect(toastAdd).toHaveBeenCalledWith({ title: t('email.added'), color: 'success' })
    expect(wrapper.emitted('addEmailAddress')).toHaveLength(1)
  })

  it('refuses an address that is not one, without asking allauth', async () => {
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'not-an-address')

    expect(wrapper.text()).toContain(t('validation.email.valid'))
    expect(addEmailAddress).not.toHaveBeenCalled()
  })

  it('shows what allauth refused and reports no change', async () => {
    addEmailAddress.mockRejectedValue(REFUSED)
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'taken@example.com')

    const { te } = useNuxtApp().$i18n
    const key = 'validation.api.email_taken'
    expect(toastAdd).toHaveBeenCalledWith({
      title: te(key) ? t(key) : 'A user is already registered with this email address.',
      color: 'error',
    })
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('addEmailAddress')).toBeUndefined()
  })

  it.each([
    ['removing', WORK.email, 'email.remove', removeEmailAddress, 'removeEmailAddress'],
    ['making primary', WORK.email, 'email.mark_as_primary', changePrimaryEmailAddress, 'changePrimaryEmailAddress'],
    ['asking for verification', NEW.email, 'email.request_verification', requestEmailVerification, 'requestEmailVerification'],
  ] as const)('reports a refusal when %s', async (_case, email, label, call, event) => {
    call.mockRejectedValue(REFUSED)
    const wrapper = await mountEmails()

    await item(wrapper, email, t(label)).onSelect()
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted(event)).toBeUndefined()
  })
})
