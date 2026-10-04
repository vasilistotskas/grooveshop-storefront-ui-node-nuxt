import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import EmailManage from '~/components/Account/EmailManage.vue'
import type { EmailAddress } from '~~/shared/types/model/all-auth'
import { asProxiedError, makeBadResponse, makeEmailAddress } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The account's email addresses, through allauth's `/account/email`: one
 * row per address — the primary marked, verified or not — with what can
 * be done to it: resend the verification (unverified), make it primary
 * (verified, not primary), remove it (not primary). Add one through the
 * section's own form. Mocked at `useAllAuthAccount`; the list is its
 * `useAsyncData` (`emailAddresses`), read again after every change that
 * alters it.
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

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/EmailManage.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const PRIMARY = makeEmailAddress()
const WORK = makeEmailAddress({ email: 'work@example.com', primary: false })
const NEW = makeEmailAddress({ email: 'new@example.com', primary: false, verified: false })

const REFUSED = asProxiedError(makeBadResponse({ code: 'email_taken', param: 'email', message: 'A user is already registered with this email address.' }))

beforeEach(() => {
  clearNuxtData('emailAddresses')
  getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW] })
})

async function mountEmails() {
  const wrapper = await mountSuspended(EmailManage, { route: false })
  // The rows sit in `<ClientOnly>`.
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('li')
const row = (wrapper: VueWrapper, email: string) => rows(wrapper).find(item => item.text().includes(email))!
/** A row's actions by their accessible names. */
const actions = (wrapper: VueWrapper, email: string) =>
  row(wrapper, email).findAll('button').map(button => button.attributes('aria-label'))
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.attributes('aria-label') === label || candidate.text() === label)!

async function addAddress(wrapper: VueWrapper, email: string) {
  await button(wrapper, messages.add).trigger('click')
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Account/EmailManage', () => {
  it('lists every address, the primary marked, with whether it is verified', async () => {
    const wrapper = await mountEmails()

    expect(rows(wrapper).map(item => item.find('.font-medium').text())).toEqual([PRIMARY.email, WORK.email, NEW.email])
    expect(row(wrapper, PRIMARY.email).text()).toContain(messages.primary)
    expect(row(wrapper, WORK.email).text()).not.toContain(messages.primary)
    expect(row(wrapper, WORK.email).text()).toContain(messages.verified)
    expect(row(wrapper, NEW.email).text()).toContain(messages.unverified)
  })

  it('offers each address only what applies to it', async () => {
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW, makeEmailAddress({ email: 'old@example.com', verified: false })] })

    const wrapper = await mountEmails()

    expect(actions(wrapper, PRIMARY.email)).toEqual([])
    expect(actions(wrapper, WORK.email)).toEqual(['Ορισμός του work@example.com ως κύριου', 'Αφαίρεση του work@example.com'])
    expect(actions(wrapper, NEW.email)).toEqual(['Νέα αποστολή επαλήθευσης στο new@example.com', 'Αφαίρεση του new@example.com'])
    // An unverified primary can be verified, never removed.
    expect(actions(wrapper, 'old@example.com')).toEqual(['Νέα αποστολή επαλήθευσης στο old@example.com'])
  })

  it('makes an address primary, then reads the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockClear()

    await button(wrapper, 'Ορισμός του work@example.com ως κύριου').trigger('click')
    await flushPromises()

    expect(changePrimaryEmailAddress).toHaveBeenCalledExactlyOnceWith({ email: WORK.email, primary: true })
    expect(getEmailAddresses).toHaveBeenCalledOnce()
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.made_primary, color: 'success' })
  })

  it('takes one change at a time', async () => {
    changePrimaryEmailAddress.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountEmails()

    await button(wrapper, 'Ορισμός του work@example.com ως κύριου').trigger('click')
    await button(wrapper, 'Αφαίρεση του new@example.com').trigger('click')

    expect(removeEmailAddress).not.toHaveBeenCalled()
    expect(button(wrapper, 'Αφαίρεση του new@example.com').attributes('disabled')).toBeDefined()
  })

  it('removes an address and shows the list allauth has left', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, NEW] })

    await button(wrapper, 'Αφαίρεση του work@example.com').trigger('click')
    await flushPromises()

    expect(removeEmailAddress).toHaveBeenCalledExactlyOnceWith({ email: WORK.email })
    expect(rows(wrapper).map(item => item.find('.font-medium').text())).toEqual([PRIMARY.email, NEW.email])
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.removed, color: 'success' })
  })

  it('resends the verification without reading the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockClear()

    await button(wrapper, 'Νέα αποστολή επαλήθευσης στο new@example.com').trigger('click')
    await flushPromises()

    expect(requestEmailVerification).toHaveBeenCalledExactlyOnceWith({ email: NEW.email })
    expect(getEmailAddresses).not.toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.resent, color: 'success' })
  })

  it('adds an address, closes the form and reads the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW, makeEmailAddress({ email: 'added@example.com', primary: false, verified: false })] })

    await addAddress(wrapper, 'added@example.com')

    expect(addEmailAddress).toHaveBeenCalledExactlyOnceWith({ email: 'added@example.com' })
    expect(row(wrapper, 'added@example.com').text()).toContain(messages.unverified)
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.added, color: 'success' })
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('refuses an address that is not one, without asking allauth', async () => {
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'not-an-address')

    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
    expect(addEmailAddress).not.toHaveBeenCalled()
  })

  it('keeps the form open and says what allauth refused', async () => {
    addEmailAddress.mockRejectedValue(REFUSED)
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'taken@example.com')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.find<HTMLInputElement>('input[type="email"]').element.value).toBe('taken@example.com')
  })
})
