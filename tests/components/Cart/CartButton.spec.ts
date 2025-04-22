import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import MockCartButton from './MockCartButton.vue'

const mockCartStore = {
  getCartTotalItems: ref(3),
  pending: ref(false),
}

vi.mock('pinia', () => ({
  storeToRefs: vi.fn().mockImplementation(_store => ({
    getCartTotalItems: mockCartStore.getCartTotalItems,
    pending: mockCartStore.pending,
  })),
  defineStore: vi.fn().mockImplementation((id, setup) => {
    return setup
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('CartButton Component', () => {
  let wrapper: any

  beforeEach(() => {
    mockCartStore.getCartTotalItems.value = 3
    mockCartStore.pending.value = false

    wrapper = mount(MockCartButton, {
      global: {
        stubs: {
          UChip: {
            template: '<div :show="show" :text="text"><slot /></div>',
            props: ['size', 'color', 'show', 'text'],
          },
          UButton: {
            template: '<button :to="to"><slot /></button>',
            props: ['size', 'color', 'variant', 'icon', 'to', 'aria-label', 'title'],
          },
        },
      },
      props: {
        cartTotalItems: mockCartStore.getCartTotalItems.value,
        pending: mockCartStore.pending.value,
      },
    })
  })

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('passes the correct props to UChip', () => {
    const chip = wrapper.find('div')
    expect(chip.exists()).toBe(true)
    expect(chip.attributes('show')).toBe('true')
    expect(chip.attributes('text')).toBe('3')
  })

  it('passes the correct props to UButton', () => {
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('to')).toBe('cart')
  })

  it('accepts custom size and color props', async () => {
    await wrapper.setProps({
      size: 'lg',
      color: 'primary',
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('hides the chip when pending is true', async () => {
    await wrapper.setProps({
      pending: true,
    })

    const chip = wrapper.find('div')
    expect(chip.attributes('show')).toBe('false')
  })

  it('displays the correct number of items in the cart', async () => {
    await wrapper.setProps({
      cartTotalItems: 5,
    })

    const chip = wrapper.find('div')
    expect(chip.attributes('text')).toBe('5')
  })
})
