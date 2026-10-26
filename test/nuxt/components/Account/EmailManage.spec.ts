import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import EmailManage from '~/components/Account/EmailManage.vue'
import WebsideEmailManage from '~/components/variants/webside/Account/EmailManage.vue'
import type { EmailAddress } from '~~/shared/types/model/all-auth'
import { asProxiedError, makeBadResponse, makeEmailAddress } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { trees } from '~~/test/helpers/trees'

/**
 * The account's email addresses, through allauth's `/account/email`: the
 * address list, what can be done to each (resend the verification, make it
 * primary, remove it) and an add form. Mocked at `useAllAuthAccount`; the
 * list is `useEmailAddresses`' `useAsyncData` (`emailAddresses`), read
 * again after every change that alters it. The two trees share that
 * logic; the default draws rows with buttons, the frozen copy a table with
 * a row menu and its own add form.
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

const messagesOf = (path: string) => YAML.parse(
  parseSfc(resolve(REPO, path)).customBlocks.find(block => block.type === 'i18n')!.content,
).el

/** The words of each tree's toasts: the default's own `<i18n>` (el), the frozen copy's global keys. */
const COPY = {
  default: () => {
    const messages = messagesOf('app/components/Account/EmailManage.vue')
    return { added: messages.added, resent: messages.resent, madePrimary: messages.made_primary, removed: messages.removed }
  },
  webside: () => {
    const { t } = useNuxtApp().$i18n
    return { added: t('email.added'), resent: t('email.verification_requested'), madePrimary: t('email.marked_as_primary'), removed: t('email.removed') }
  },
}

const PRIMARY = makeEmailAddress()
const WORK = makeEmailAddress({ email: 'work@example.com', primary: false })
const NEW = makeEmailAddress({ email: 'new@example.com', primary: false, verified: false })

const REFUSED = asProxiedError(makeBadResponse({ code: 'email_taken', param: 'email', message: 'A user is already registered with this email address.' }))

beforeEach(() => {
  clearNuxtData('emailAddresses')
  getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW] })
})

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.attributes('aria-label') === label || candidate.text() === label)!

describe.each(trees(EmailManage, WebsideEmailManage))('$tree Account/EmailManage', ({ tree, C }) => {
  const copy = COPY[tree]

  async function mountEmails() {
    const wrapper = await mountSuspended(C, { route: false })
    // The rows sit in `<ClientOnly>`.
    await flushPromises()
    return wrapper
  }

  async function addAddress(wrapper: VueWrapper, email: string) {
    // The default opens its form on "Add email"; the frozen copy always shows it.
    if (tree === 'default') await button(wrapper, messagesOf('app/components/Account/EmailManage.vue').add).trigger('click')
    await wrapper.find('input[type="email"]').setValue(email)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  it('lists every address the account has', async () => {
    const wrapper = await mountEmails()

    for (const address of [PRIMARY, WORK, NEW]) expect(wrapper.text()).toContain(address.email)
  })

  it('adds an address and reads the list again', async () => {
    const wrapper = await mountEmails()
    getEmailAddresses.mockResolvedValue({ status: 200, data: [PRIMARY, WORK, NEW, makeEmailAddress({ email: 'added@example.com', primary: false, verified: false })] })

    await addAddress(wrapper, 'added@example.com')

    expect(addEmailAddress).toHaveBeenCalledExactlyOnceWith({ email: 'added@example.com' })
    expect(wrapper.text()).toContain('added@example.com')
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: copy().added, color: 'success' })
  })

  it('refuses an address that is not one, without asking allauth', async () => {
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'not-an-address')

    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
    expect(addEmailAddress).not.toHaveBeenCalled()
  })

  it('says what allauth refused', async () => {
    addEmailAddress.mockRejectedValue(REFUSED)
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'taken@example.com')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it.runIf(tree === 'default')('keeps what was typed when allauth refuses', async () => {
    addEmailAddress.mockRejectedValue(REFUSED)
    const wrapper = await mountEmails()

    await addAddress(wrapper, 'taken@example.com')

    expect(wrapper.find<HTMLInputElement>('input[type="email"]').element.value).toBe('taken@example.com')
  })

  describe.runIf(tree === 'webside')('row menu', () => {
    /** The menu items of the row for `email`, a teleported popup opened from the row's trigger. */
    async function openMenu(wrapper: VueWrapper, email: string) {
      const rowEl = wrapper.findAll('tr').find(item => item.text().includes(email))!
      await rowEl.get('button[aria-haspopup="menu"]').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    }

    it('makes an address primary from its menu, then reads the list again', async () => {
      const wrapper = await mountEmails()
      getEmailAddresses.mockClear()

      const items = await openMenu(wrapper, WORK.email)
      items.find(item => item.textContent?.includes(useNuxtApp().$i18n.t('email.mark_as_primary')))!.click()
      await flushPromises()

      expect(changePrimaryEmailAddress).toHaveBeenCalledExactlyOnceWith({ email: WORK.email, primary: true })
      expect(getEmailAddresses).toHaveBeenCalledOnce()
      expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: copy().madePrimary, color: 'success' })
    })

    it('resends the verification from its menu without reading the list again', async () => {
      const wrapper = await mountEmails()
      getEmailAddresses.mockClear()

      const items = await openMenu(wrapper, NEW.email)
      items.find(item => item.textContent?.includes(useNuxtApp().$i18n.t('email.request_verification')))!.click()
      await flushPromises()

      expect(requestEmailVerification).toHaveBeenCalledExactlyOnceWith({ email: NEW.email })
      expect(getEmailAddresses).not.toHaveBeenCalled()
    })
  })

  describe.runIf(tree === 'default')('row actions', () => {
    const messages = messagesOf('app/components/Account/EmailManage.vue')
    const rows = (wrapper: VueWrapper) => wrapper.findAll('li')
    const row = (wrapper: VueWrapper, email: string) => rows(wrapper).find(item => item.text().includes(email))!
    /** A row's actions by their accessible names. */
    const actions = (wrapper: VueWrapper, email: string) =>
      row(wrapper, email).findAll('button').map(candidate => candidate.attributes('aria-label'))

    it('lists the primary marked, with whether each is verified', async () => {
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
      expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: copy().madePrimary, color: 'success' })
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
      expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: copy().removed, color: 'success' })
    })

    it('resends the verification without reading the list again', async () => {
      const wrapper = await mountEmails()
      getEmailAddresses.mockClear()

      await button(wrapper, 'Νέα αποστολή επαλήθευσης στο new@example.com').trigger('click')
      await flushPromises()

      expect(requestEmailVerification).toHaveBeenCalledExactlyOnceWith({ email: NEW.email })
      expect(getEmailAddresses).not.toHaveBeenCalled()
      expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: copy().resent, color: 'success' })
    })

    it('closes the add form once the address is added', async () => {
      const wrapper = await mountEmails()

      await addAddress(wrapper, 'added@example.com')

      expect(wrapper.find('form').exists()).toBe(false)
    })
  })
})
