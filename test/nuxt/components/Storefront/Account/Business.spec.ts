import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createError, readBody } from 'h3'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Business from '~/components/Storefront/Account/Business.vue'
import type { BusinessProfile } from '~~/shared/openapi/types.gen'
import { makeBusinessProfile } from '~~/test/fixtures/business'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The wholesale profile: where the application stands, then the company
 * details. No profile yet (404) is an invitation to apply with a blank
 * form; any other failure says so. The VAT number shows its VIES check
 * while it is the number checked. A suspended profile gets no form.
 */
const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Account/Business.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const answer = vi.hoisted(() => ({ profile: null as BusinessProfile | null, status: 200, saved: [] as unknown[] }))

beforeEach(() => {
  answer.profile = makeBusinessProfile({ vatId: '123456783' })
  answer.status = 200
  answer.saved = []
  clearNuxtData('account:b2b-profile')
  registerEndpoint('/api/b2b/profile', {
    method: 'GET',
    handler: () => {
      if (answer.status !== 200) throw createError({ statusCode: answer.status })
      return answer.profile
    },
  })
  registerEndpoint('/api/b2b/profile', {
    method: 'PUT',
    handler: async (event) => {
      answer.saved.push(await readBody(event))
      return answer.profile
    },
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(Business, { route: false })
  await flushPromises()
  return wrapper
}

const alert = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'UAlert' })

describe('Storefront/Account/Business', () => {
  it('says the approved profile is active, with its group, and that edits go back for review', async () => {
    const wrapper = await mountPage()

    expect(alert(wrapper).props('title')).toBe('Εγκεκριμένος · Χονδρική')
    expect(alert(wrapper).props('description')).toBe(messages.status.APPROVED.description)
    expect(alert(wrapper).props('color')).toBe('success')
  })

  it.each([
    ['PENDING', 'warning'],
    ['SUSPENDED', 'error'],
  ] as const)('says where a %s application stands', async (status, color) => {
    answer.profile = makeBusinessProfile({ status, customerGroupName: null })

    const wrapper = await mountPage()

    expect(alert(wrapper).props('title')).toBe(messages.status[status].title)
    expect(alert(wrapper).props('color')).toBe(color)
  })

  it('gives the store\'s reason for a rejection', async () => {
    answer.profile = makeBusinessProfile({ status: 'REJECTED', rejectionReason: 'Ο ΑΦΜ δεν αντιστοιχεί στην επωνυμία.' })

    const wrapper = await mountPage()

    expect(alert(wrapper).props('description')).toBe('Ο ΑΦΜ δεν αντιστοιχεί στην επωνυμία.')
  })

  it('offers no form to a suspended profile', async () => {
    answer.profile = makeBusinessProfile({ status: 'SUSPENDED' })

    const wrapper = await mountPage()

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('invites a shopper with no profile to apply, with a blank form', async () => {
    answer.status = 404

    const wrapper = await mountPage()

    expect(alert(wrapper).props('title')).toBe(messages.intro.title)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toBe(messages.form.submit)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('says the details could not be loaded on any other failure, instead of inviting an application', async () => {
    answer.status = 502

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain(messages.load_error)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows the VIES check while the VAT number is the one checked', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Έγκυρος · ελέγχθηκε στο VIES στις')

    await wrapper.findAll('input')[2]!.setValue('123456791')

    expect(wrapper.text()).not.toContain('ελέγχθηκε στο VIES')
    expect(wrapper.text()).toContain(messages.form.vat_help)
  })

  it('saves the details and reads the profile again', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('input')[0]!.setValue('Groove Office ΑΕ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(answer.saved).toEqual([expect.objectContaining({ companyName: 'Groove Office ΑΕ', vatId: '123456783' })])
    // The answer travels through the test server; waited on, not assumed.
    await vi.waitFor(() => expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.submit.success, color: 'success' }))
  })

  it('refuses a VAT number that fails the ΑΦΜ checksum, without asking the server', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('input')[2]!.setValue('123456789')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(answer.saved).toEqual([])
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.billing_vat.checksum'))
  })

  it('puts the saved details back on cancel', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('input')[0]!.setValue('Κάτι άλλο')
    await wrapper.findAll('button').find(button => button.text() === messages.form.cancel)!.trigger('click')

    expect(wrapper.findAll<HTMLInputElement>('input')[0]!.element.value).toBe('Groove Office ΙΚΕ')
  })
})
