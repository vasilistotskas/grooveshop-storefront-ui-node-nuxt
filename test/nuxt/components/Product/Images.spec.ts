import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ProductImages from '~/components/Product/Images.vue'
import WebsideProductImages from '~/components/variants/webside/Product/Images.vue'
import { makeProduct } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'
import { inlineT } from '~~/test/helpers/inlineCopy'

/**
 * The gallery's corner badge: sold out, else the percentage of an
 * announced reduction. A markdown or a promotion with no prior price
 * announces nothing.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const badgeOf = async (overrides: Parameters<typeof makeProduct>[0]) => {
  const wrapper = await mountSuspended(ProductImages, {
    props: { product: { ...makeProduct({ id: 5, ...overrides }), priceDropAlertsEnabled: false }, productName: 'Προϊόν 5' },
    global: { stubs: { ImgWithFallback: true } },
    route: false,
  })
  await flushPromises()
  const badge = wrapper.findComponent({ name: 'UBadge' })
  return badge.exists() ? badge.text() : undefined
}

describe('Product/Images', () => {
  beforeEach(() => {
    clearNuxtData()
    api.routes({ '/api/products/5/images': [] })
  })

  it('badges the percentage Django computed from the prior price', async () => {
    expect(await badgeOf({ priorPrice: 80, announcedDiscountPercent: 22 })).toBe('−22%')
  })

  it('badges sold out ahead of an announced reduction', async () => {
    expect(await badgeOf({ stock: 0, priorPrice: 80, announcedDiscountPercent: 22 })).toBe('Εξαντλήθηκε')
  })

  it('badges nothing for a markdown or a promotion that has no prior price', async () => {
    expect(await badgeOf({ offerKind: 'MARKDOWN' })).toBeUndefined()
    expect(await badgeOf({ offerKind: 'PROMOTION' })).toBeUndefined()
  })
})

/**
 * The gallery asks for the product's images the way the product page does
 * (`useProductImages`: one key, so it joins the page's request), in the
 * page's language, and draws what comes back.
 */
describe.each(trees(ProductImages, WebsideProductImages))('$tree Product/Images request', ({ C }) => {
  beforeEach(() => {
    clearNuxtData()
  })

  it('asks for the product\'s images once, in the page language, and draws them', async () => {
    api.routes({
      '/api/products/5/images': [{ id: 1, isMain: true, mainImagePath: 'media/uploads/products/a.png' }, { id: 2, isMain: false, mainImagePath: 'media/uploads/products/b.png' }],
    })

    const wrapper = await mountSuspended(C, {
      props: { product: { ...makeProduct({ id: 5 }), priceDropAlertsEnabled: false }, productName: 'Προϊόν 5' },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })
    await flushPromises()

    expect(api.callsTo('/api/products/5/images').map(call => call.options.query)).toEqual([{ languageCode: 'el' }])
    expect(wrapper.findAllComponents({ name: 'ImgWithFallback' }).length).toBeGreaterThanOrEqual(2)
  })
})

/**
 * Each photograph's alt text: the store's own where it wrote one (Django's
 * `altText`: the alt text, else the title), else the product's name and
 * the photograph's place in the gallery, never a generic "Product image"
 * (the store's request, 2026-11-03).
 */
describe.each(trees(ProductImages, WebsideProductImages))('$tree Product/Images alt text', ({ C }) => {
  beforeEach(() => {
    clearNuxtData()
    api.routes({
      '/api/products/5/images': [
        { id: 1, isMain: true, altText: 'Μαύρο power bank κουμπωμένο σε κινητό', mainImagePath: 'media/uploads/products/a.png' },
        { id: 2, isMain: false, altText: '', mainImagePath: 'media/uploads/products/b.png' },
      ],
    })
  })

  it('uses the store\'s alt text, else names the product and the photograph\'s number', async () => {
    const wrapper = await mountSuspended(C, {
      props: { product: { ...makeProduct({ id: 5 }), priceDropAlertsEnabled: false }, productName: 'Mini Power Bank' },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })
    await flushPromises()

    const alts = new Set(wrapper.findAllComponents({ name: 'ImgWithFallback' }).map(img => img.attributes('alt')))
    expect(alts).toEqual(new Set([
      'Μαύρο power bank κουμπωμένο σε κινητό',
      useNuxtApp().$i18n.t('product_image.alt', { name: 'Mini Power Bank', number: 2 }),
    ]))
  })
})

/**
 * The default gallery's position on a phone: plain marks, not buttons. Nuxt
 * UI's carousel dots are 6px buttons 6px apart, which no finger can hit
 * (`product-page-targets.spec.ts` keeps them out). The marks are hidden from
 * assistive technology, which reads the position as words in each
 * photograph; swiping, the thumbnails and the zoom viewer move between them.
 */
describe('Product/Images position', () => {
  beforeEach(() => {
    clearNuxtData()
    api.routes({
      '/api/products/5/images': [1, 2, 3].map(id => ({ id, isMain: id === 1, mainImagePath: `media/uploads/products/${id}.png` })),
    })
  })

  it('marks the photograph shown without buttons, and says it as words', async () => {
    const wrapper = await mountSuspended(ProductImages, {
      props: { product: { ...makeProduct({ id: 5 }), priceDropAlertsEnabled: false }, productName: 'Προϊόν 5' },
      global: { stubs: { ImgWithFallback: true } },
      route: false,
    })
    await flushPromises()

    expect(wrapper.find('[role="tab"]').exists()).toBe(false)
    const marks = wrapper.get('[data-slot="position"]')
    expect(marks.attributes('aria-hidden')).toBe('true')
    expect(marks.findAll('button, [tabindex]')).toHaveLength(0)
    expect(marks.findAll('span').map(mark => mark.attributes('data-current'))).toEqual(['true', undefined, undefined])
    const t = inlineT('app/components/Product/Images.vue')
    expect(wrapper.findAll('.sr-only').map(words => words.text())).toEqual(
      [1, 2, 3].map(current => t('position', { current, total: 3 })),
    )
  })
})
