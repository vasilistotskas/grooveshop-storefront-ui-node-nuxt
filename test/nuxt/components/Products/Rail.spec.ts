import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsRail from '~/components/Products/Rail.vue'
import { makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

const items = [makeProductCard({ id: 7 }), makeProductCard({ id: 8 })]

/** Stands in for the default product card: shows what it was given and the element it was told to be. */
const CardStub = defineComponent({
  props: { product: { type: Object, required: true }, as: { type: String, default: 'li' }, showAddToCartButton: Boolean },
  setup: props => () => h(props.as, {
    'data-card': (props.product as { id: number }).id,
    'data-add-to-cart': String(props.showAddToCartButton),
  }),
})

const mountRail = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) =>
  mountSuspended(ProductsRail, {
    route: false,
    props: { products: items, ...props },
    slots,
    global: { stubs: { ProductCard: CardStub } },
  } as never)

/** The rail's own slides, as the carousel's viewport holds them. */
const slides = (wrapper: Awaited<ReturnType<typeof mountRail>>) => wrapper.findAll('[data-slot="item"]')

describe('Products/Rail', () => {
  beforeEach(() => {
    setTenant()
  })

  it('draws the default card on each slide, as a div, since a slide is no list', async () => {
    const wrapper = await mountRail()

    expect(slides(wrapper)).toHaveLength(2)
    expect(wrapper.findAll('[data-card]').map(card => [card.element.tagName, card.attributes('data-card')]))
      .toEqual([['DIV', '7'], ['DIV', '8']])
  })

  it('passes the add-to-cart choice to the card', async () => {
    const wrapper = await mountRail({ showAddToCart: false })

    expect(wrapper.findAll('[data-add-to-cart]').map(card => card.attributes('data-add-to-cart'))).toEqual(['false', 'false'])
  })

  it('draws a design\'s own card through the slot instead, with what the default one is given', async () => {
    const wrapper = await mountRail({ showAddToCart: false }, {
      card: ({ product, showAddToCart }: { product: { id: number }, showAddToCart: boolean }) =>
        h('article', { 'data-own': product.id, 'data-add-to-cart': String(showAddToCart) }),
    })

    expect(wrapper.find('[data-card]').exists()).toBe(false)
    expect(wrapper.findAll('[data-own]').map(card => [card.attributes('data-own'), card.attributes('data-add-to-cart')]))
      .toEqual([['7', 'false'], ['8', 'false']])
  })

  // The class is the contract: happy-dom lays nothing out. The theme's -ms-4 on
  // the container, which the rail's px-2 items do not answer, pulled the first
  // card 16px left of the band's heading and the viewport cut off 8px of it.
  it('leaves the first card where the band\'s heading starts, uncut', async () => {
    const wrapper = await mountRail()
    const container = wrapper.find('[data-slot="container"]')

    expect(container.classes()).toContain('ms-0')
    expect(container.classes()).not.toContain('-ms-4')
  })
})
