import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'
import HeroBanner from '~/components/PageSection/HeroBanner.vue'
import MediaText from '~/components/PageSection/MediaText.vue'
import FyteiaCtaBanner from '~/components/PageSection/variants/ekfyseosfyteias/CtaBanner.vue'
import FyteiaHero from '~/components/PageSection/variants/ekfyseosfyteias/Hero.vue'
import FyteiaMediaText from '~/components/PageSection/variants/ekfyseosfyteias/MediaText.vue'
import { makeResolvedImage } from '~~/test/fixtures/media'
import { makeProductCard } from '~~/test/fixtures/product'

/**
 * Every section with a main button, in each design that draws it, the same
 * way: a button that only links stays a link with the merchant's words, and
 * one that stays on the page is a button holding what the action says. Webside
 * draws the default components for these three blocks. What each action does
 * is `useSectionAction`'s, and has its own spec.
 */
const picture = makeResolvedImage('https://assets.example.test/jars.jpg', 'Βάζα')

const SECTIONS = [
  { name: 'default cta_banner', component: CtaBanner, action: 'buttonAction', label: 'buttonText', props: { heading: 'Τίτλος' } },
  { name: 'default hero_banner', component: HeroBanner, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος' } },
  { name: 'default media_text', component: MediaText, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος' } },
  { name: 'fyteia cta_banner', component: FyteiaCtaBanner, action: 'buttonAction', label: 'buttonText', props: { heading: 'Τίτλος' } },
  { name: 'fyteia media_text', component: FyteiaMediaText, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος' } },
  { name: 'fyteia hero_banner, the seal', component: FyteiaHero, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος', image: picture } },
  { name: 'fyteia hero_banner, the photo', component: FyteiaHero, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος', image: picture, theme: 'dark' } },
  { name: 'fyteia hero_banner, the page hero', component: FyteiaHero, action: 'ctaAction', label: 'ctaText', props: { heading: 'Τίτλος' } },
]

const soldOut = { kind: 'addToCart', product: { status: 'ok', value: makeProductCard({ id: 5, stock: 0, active: true }) } }
const onSale = { kind: 'addToCart', product: { status: 'ok', value: makeProductCard({ id: 5, stock: 3, active: true }) } }

describe.each(SECTIONS)('$name', ({ component, action, label, props }) => {
  const mountWith = (ctaAction: unknown) => mountSuspended(component as never, {
    route: false,
    props: { ...props, [label]: 'Πάμε', [action]: ctaAction } as never,
  })
  const buttonIn = (wrapper: Awaited<ReturnType<typeof mountWith>>) =>
    wrapper.findAll('button').find(button => ['Πάμε', useNuxtApp().$i18n.t('section_action.unavailable')].includes(button.text()))

  it('draws a link that goes where the action says', async () => {
    const wrapper = await mountWith({ kind: 'link', to: '/products' })

    expect(wrapper.findAll('a').map(link => [link.text(), link.attributes('href')])).toContainEqual(['Πάμε', '/products'])
    expect(buttonIn(wrapper)).toBeUndefined()
  })

  it('draws a button, in the merchant\'s words, for an action that stays on the page', async () => {
    const wrapper = await mountWith(onSale)

    expect(buttonIn(wrapper)?.text()).toBe('Πάμε')
    expect(buttonIn(wrapper)?.attributes('disabled')).toBeUndefined()
    expect(wrapper.findAll('a').map(link => link.text())).not.toContain('Πάμε')
  })

  it('hands the button what the action says of a product that cannot be added', async () => {
    const wrapper = await mountWith(soldOut)

    expect(buttonIn(wrapper)?.text()).toBe(useNuxtApp().$i18n.t('section_action.unavailable'))
    expect(buttonIn(wrapper)?.attributes('disabled')).toBeDefined()
  })

  it('draws no button with no action', async () => {
    const wrapper = await mountWith(undefined)

    expect(buttonIn(wrapper)).toBeUndefined()
    expect(wrapper.findAll('a').map(link => link.text())).not.toContain('Πάμε')
  })
})
