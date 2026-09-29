/**
 * Tests for Form/PhoneInput.vue — ONE phone field for every country.
 *
 * A number typed without ``+code`` / ``00code`` is read against the
 * form's own country; with one it is read against the country the code
 * names. The recognised country shows as a flag + dial code INSIDE the
 * field (trailing slot, with the input's end padding widened so it can
 * never overlap the digits). The model keeps exactly what was typed;
 * E.164 is produced where it is validated and submitted.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import PhoneInput from '~/components/Form/PhoneInput.vue'

function row(alpha2: string, phoneCode: number, el: string, exampleMobile: string) {
  return {
    alpha2,
    phoneCode,
    translations: { el: { name: el }, en: { name: el } },
    phoneMetadata: {
      nationalNumberPattern: '\\d+',
      possibleLengths: [8, 10],
      nationalPrefixForParsing: null,
      exampleMobile,
    },
  }
}

registerEndpoint('/api/countries', () => ({
  count: 5,
  results: [
    row('GR', 30, 'Ελλάδα', '6912345678'),
    row('CY', 357, 'Κύπρος', '96123456'),
    row('DE', 49, 'Γερμανία', '15123456789'),
    row('US', 1, 'ΗΠΑ', '2015550123'),
    row('CA', 1, 'Καναδάς', '5062345678'),
  ],
}))

async function mountField(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(PhoneInput, {
    props: { label: 'Τηλέφωνο', name: 'phone', country: 'GR', ...props },
  })
  await flushPromises()
  return wrapper
}

describe('Form/PhoneInput', () => {
  it('is ONE tel input that autofill can fill with the full number', async () => {
    const wrapper = await mountField()

    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]!.attributes('type')).toBe('tel')
    expect(inputs[0]!.attributes('inputmode')).toBe('tel')
    expect(inputs[0]!.attributes('autocomplete')).toBe('tel')
    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)
  })

  it('uses the form country\'s example as the placeholder', async () => {
    const gr = await mountField({ country: 'GR' })
    expect(gr.find('input').attributes('placeholder')).toBe('6912345678')

    const cy = await mountField({ country: 'CY' })
    expect(cy.find('input').attributes('placeholder')).toBe('96123456')
  })

  it('explains how to enter another country\'s number, and nothing about SMS or couriers', async () => {
    const wrapper = await mountField()

    const text = wrapper.text()
    expect(text).toContain('+30')
    expect(text).toContain('ξεκινήστε με τον κωδικό της')
    expect(text).not.toMatch(/SMS|κούριερ|courier/i)
  })

  it('shows no badge while empty', async () => {
    const wrapper = await mountField()

    expect(wrapper.find('input').classes().join(' ')).not.toContain('pe-28')
    expect(wrapper.text()).not.toContain('Αναγνωρίστηκε')
  })

  it('shows the form country as the badge for a national number', async () => {
    const wrapper = await mountField({ country: 'CY', modelValue: '96123456' })

    expect(wrapper.text()).toContain('+357')
    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Κύπρος (+357)')
  })

  it('shows the country a +code names, whatever the form country is', async () => {
    const wrapper = await mountField({ country: 'GR', modelValue: '+35796123456' })

    expect(wrapper.text()).toContain('+357')
    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Κύπρος (+357)')
    expect(wrapper.text()).not.toContain('+30 ')
  })

  it('reads 00<code> like +<code>', async () => {
    const wrapper = await mountField({ country: 'CY', modelValue: '00306912345678' })

    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Ελλάδα (+30)')
  })

  it('keeps the form country for a shared code (+1)', async () => {
    const wrapper = await mountField({ country: 'CA', modelValue: '+15062345678' })
    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Καναδάς (+1)')

    const other = await mountField({ country: 'GR', modelValue: '+12015550123' })
    expect(other.text()).toContain('Αναγνωρίστηκε: ΗΠΑ (+1)')
  })

  it('updates the badge as the shopper types, and emits what was typed (not E.164)', async () => {
    const wrapper = await mountField({ country: 'GR' })

    await wrapper.find('input').setValue('+35796123456')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+35796123456'])
    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Κύπρος (+357)')

    await wrapper.find('input').setValue('6912345678')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['6912345678'])
    expect(wrapper.text()).toContain('Αναγνωρίστηκε: Ελλάδα (+30)')
  })

  it('reserves end padding for the badge, so a code can never overlap the digits', async () => {
    const wrapper = await mountField({ modelValue: '+35796123456', size: 'xl' })

    const input = wrapper.find('input')
    // twMerge keeps the caller's `pe-28` over the size variant's `pe-11`.
    expect(input.classes()).toContain('pe-28')
    expect(input.classes()).not.toContain('pe-11')

    // The badge sits in the input's own trailing slot (absolute, end-aligned)
    // and never takes pointer events from the input.
    const trailing = wrapper.find('input').element.parentElement!.querySelector('span.absolute.end-0')
    expect(trailing).not.toBeNull()
    expect(trailing!.className).toContain('pointer-events-none')
    expect(trailing!.textContent).toContain('+357')
  })

  it('falls back to the ISO code when a country has no flag (decorative flag, text under it)', async () => {
    const wrapper = await mountField({ modelValue: '+35796123456' })

    const flag = wrapper.find('[aria-hidden="true"].rounded-full')
    expect(flag.exists()).toBe(true)
    expect(flag.text()).toContain('CY')
  })
})
