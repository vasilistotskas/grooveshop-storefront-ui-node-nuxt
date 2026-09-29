/**
 * Tests for Form/PhoneInput.vue — a country picker joined to the number
 * (Nuxt UI's phone-number pattern).
 *
 * The picker holds its own country: it FOLLOWS the delivery country until
 * the shopper picks one (or types / pastes / autofills a ``+code``), then
 * stays. The dial code is fixed text in the input's leading slot with the
 * start padding sized to it, so no code length can overlap the digits. The
 * model is E.164, built from the picked country + the national digits.
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

// API order (sort_order), deliberately NOT alphabetical.
registerEndpoint('/api/countries', () => ({
  count: 6,
  results: [
    row('US', 1, 'ΗΠΑ', '2015550123'),
    row('GR', 30, 'Ελλάδα', '6912345678'),
    row('DE', 49, 'Γερμανία', '15123456789'),
    row('CY', 357, 'Κύπρος', '96123456'),
    row('CA', 1, 'Καναδάς', '5062345678'),
    row('AL', 355, 'Αλβανία', '672123456'),
  ],
}))

type Wrapper = Awaited<ReturnType<typeof mountField>>

async function mountField(props: Record<string, unknown> = {}) {
  // Behave like `v-model` in the parent — including for writes made while
  // the component is still mounting (a saved number being parsed).
  let mounted: { setProps: (props: Record<string, unknown>) => Promise<void> } | undefined
  const early: Record<string, unknown> = {}
  const write = (key: string) => (value: string | undefined) => {
    if (mounted) void mounted.setProps({ [key]: value })
    else early[key] = value
  }
  const wrapper = await mountSuspended(PhoneInput, {
    props: {
      'label': 'Τηλέφωνο',
      'name': 'phone',
      'followCountry': 'GR',
      'pinnedCountries': ['GR', 'CY'],
      'modelValue': '',
      'country': undefined,
      'onUpdate:modelValue': write('modelValue'),
      'onUpdate:country': write('country'),
      ...props,
    },
  })
  mounted = wrapper
  await wrapper.setProps(early)
  await flushPromises()
  return wrapper
}

function picker(wrapper: Wrapper) {
  return wrapper.findComponent({ name: 'USelectMenu' })
}

function pick(wrapper: Wrapper, alpha2: string) {
  picker(wrapper).vm.$emit('update:modelValue', alpha2)
}

async function type(wrapper: Wrapper, value: string) {
  await wrapper.find('input').setValue(value)
  await flushPromises()
}

const leading = (wrapper: Wrapper) => wrapper.find('input').element.parentElement!.querySelector('span.absolute')

describe('Form/PhoneInput', () => {
  it('is a country picker plus a tel input that autofill can fill with the full number', async () => {
    const wrapper = await mountField()

    expect(picker(wrapper).find('button').exists()).toBe(true)
    const inputs = wrapper.findAll('input[type="tel"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]!.attributes('inputmode')).toBe('tel')
    expect(inputs[0]!.attributes('autocomplete')).toBe('tel')
  })

  describe('picker trigger', () => {
    it('shows only the flag, named for assistive tech with the country and code', async () => {
      const wrapper = await mountField({ followCountry: 'CY' })

      const trigger = picker(wrapper).find('button')
      expect(trigger.attributes('aria-label')).toBe('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
      expect(trigger.text()).toContain('CY')
      expect(trigger.text()).not.toContain('+357')
      expect(trigger.text()).not.toContain('Κύπρος')
    })
  })

  describe('dropdown', () => {
    it('lists the shippable countries first, then a separator, then the rest A–Z', async () => {
      const wrapper = await mountField()

      const items = picker(wrapper).props('items') as Array<Record<string, string>>
      // Rest by localized name: Αλβανία, Γερμανία, ΗΠΑ, Καναδάς.
      expect(items.map(item => item.value ?? item.type)).toEqual(
        ['GR', 'CY', 'separator', 'AL', 'DE', 'US', 'CA'],
      )
    })

    it('labels each row with the localized name and the dial code, and searches by name, alpha-2 and code', async () => {
      const wrapper = await mountField()

      const menu = picker(wrapper)
      const cy = (menu.props('items') as Array<Record<string, string>>).find(item => item.value === 'CY')!
      expect(cy.label).toBe('Κύπρος')
      expect(cy.dialCode).toBe('+357')
      // What `filter-fields` searches: name, then alpha-2 and the code.
      expect(menu.props('filterFields')).toEqual(['label', 'searchTerms'])
      expect(cy.searchTerms).toContain('+357')
      expect(cy.searchTerms).toContain('CY')
    })

    it('is virtualized, so ~250 rows stay cheap', async () => {
      const wrapper = await mountField()

      expect(picker(wrapper).props('virtualize')).toBeTruthy()
    })
  })

  describe('the number', () => {
    it('shows the picked country\'s dial code as fixed leading text, with padding sized to it', async () => {
      const wrapper = await mountField({ followCountry: 'CY' })

      const input = wrapper.find('input')
      expect(input.classes()).toContain('ps-(--dial-code-length)')
      // "+357" is 4 characters, plus 1.5ch of breathing room.
      expect(input.attributes('style') ?? wrapper.html()).toContain('--dial-code-length: 5.5ch')
      expect(leading(wrapper)!.textContent).toContain('+357')
      expect(leading(wrapper)!.className).toContain('pointer-events-none')
    })

    it('sizes the padding to a longer code too (+1 vs +357)', async () => {
      const wrapper = await mountField({ followCountry: 'US' })

      expect(leading(wrapper)!.textContent).toContain('+1')
      expect(wrapper.html()).toContain('--dial-code-length: 3.5ch')
    })

    it('uses the picked country\'s example as the placeholder', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })
      expect(wrapper.find('input').attributes('placeholder')).toBe('6912345678')

      pick(wrapper, 'CY')
      await flushPromises()
      expect(wrapper.find('input').attributes('placeholder')).toBe('96123456')
    })

    it('has no recognised-country badge, padding hack or hint', async () => {
      const wrapper = await mountField({ modelValue: '+35796123456' })

      expect(wrapper.text()).not.toContain('Αναγνωρίστηκε')
      expect(wrapper.text()).not.toContain('ξεκινήστε')
      expect(wrapper.find('input').classes()).not.toContain('pe-28')
    })
  })

  describe('E.164 model', () => {
    it('is the picked country\'s dial code + the national digits', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      await type(wrapper, '6912345678')

      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+306912345678'])
    })

    it('is empty while nothing is typed', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      await type(wrapper, '69')
      await type(wrapper, '')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    })

    it('parses a saved E.164 back into picker country + national digits', async () => {
      const wrapper = await mountField({ followCountry: 'GR', modelValue: '+35796123456' })

      expect(wrapper.find('input').element.value).toBe('96123456')
      expect(picker(wrapper).props('modelValue')).toBe('CY')
      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['CY'])
      expect(leading(wrapper)!.textContent).toContain('+357')
    })

    it('leaves the picker following when a saved number is the delivery country\'s', async () => {
      const wrapper = await mountField({ followCountry: 'GR', modelValue: '+306912345678' })

      expect(wrapper.find('input').element.value).toBe('6912345678')
      expect(wrapper.emitted('update:country')).toBeUndefined()
    })
  })

  describe('typing, pasting and autofill of +code / 00code', () => {
    it('+357 96123456 switches the picker to Cyprus and strips the code', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      await type(wrapper, '+357 96123456')

      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['CY'])
      expect(wrapper.find('input').element.value).toBe('96123456')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+35796123456'])
      expect(picker(wrapper).props('modelValue')).toBe('CY')
    })

    it('0030 691 2345678 switches the picker to Greece and strips the code', async () => {
      const wrapper = await mountField({ followCountry: 'CY' })

      await type(wrapper, '0030 691 2345678')

      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['GR'])
      expect(wrapper.find('input').element.value).toBe('6912345678')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+306912345678'])
    })

    it('strips a code that names the country already picked (the input never keeps it)', async () => {
      const wrapper = await mountField({ followCountry: 'CY' })

      await type(wrapper, '+357')

      expect(wrapper.find('input').element.value).toBe('')
      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['CY'])
    })

    it('keeps the picked country for a shared code (+1)', async () => {
      const wrapper = await mountField({ followCountry: 'CA' })

      await type(wrapper, '+15062345678')

      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['CA'])
    })

    it('takes the first listed country for a shared code it was not following', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      await type(wrapper, '+15062345678')

      // Rest is A–Z: ΗΠΑ (US) comes before Καναδάς (CA).
      expect(wrapper.emitted('update:country')?.at(-1)).toEqual(['US'])
    })

    it('waits for a code that names no country yet', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      await type(wrapper, '+3')

      expect(wrapper.find('input').element.value).toBe('+3')
      expect(wrapper.emitted('update:country')).toBeUndefined()
    })
  })

  describe('changing the picker', () => {
    it('keeps the typed digits and only swaps the dial code', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })
      await type(wrapper, '96123456')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+3096123456'])

      pick(wrapper, 'CY')
      await flushPromises()

      expect(wrapper.find('input').element.value).toBe('96123456')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+35796123456'])
      expect(leading(wrapper)!.textContent).toContain('+357')
    })
  })

  describe('follow, then sticky', () => {
    it('follows the delivery country until the shopper picks', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })
      expect(leading(wrapper)!.textContent).toContain('+30')

      await wrapper.setProps({ followCountry: 'CY' })
      await flushPromises()

      expect(leading(wrapper)!.textContent).toContain('+357')
      expect(picker(wrapper).props('modelValue')).toBe('CY')
      // Following is not a choice: nothing is claimed as picked.
      expect(wrapper.emitted('update:country')).toBeUndefined()
    })

    it('stays on the shopper\'s pick when the delivery country changes later', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      pick(wrapper, 'DE')
      await flushPromises()
      await wrapper.setProps({ followCountry: 'CY' })
      await flushPromises()

      expect(picker(wrapper).props('modelValue')).toBe('DE')
      expect(leading(wrapper)!.textContent).toContain('+49')
    })

    it('also stays after a typed +code', async () => {
      const wrapper = await mountField({ followCountry: 'GR' })

      await type(wrapper, '+357 96123456')
      await wrapper.setProps({ followCountry: 'DE' })
      await flushPromises()

      expect(picker(wrapper).props('modelValue')).toBe('CY')
    })

    it('resumes following when the parent clears the pick (a new address)', async () => {
      const wrapper = await mountField({ followCountry: 'GR', country: 'DE' })
      expect(picker(wrapper).props('modelValue')).toBe('DE')

      await wrapper.setProps({ country: '' })
      await flushPromises()

      expect(picker(wrapper).props('modelValue')).toBe('GR')
    })
  })
})
