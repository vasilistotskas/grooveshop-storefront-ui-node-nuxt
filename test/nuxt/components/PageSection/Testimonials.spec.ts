import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import Testimonials from '~/components/PageSection/Testimonials.vue'

const mountReviews = (items: unknown[]) => mountSuspended(Testimonials, { route: false, props: { items } as Record<string, unknown> })
const QUOTE = { name: 'Μαρία', text: 'Πολύ καλό' }

describe('PageSection/Testimonials photo', () => {
  it('draws the photograph, described by its asset', async () => {
    const wrapper = await mountReviews([{ ...QUOTE, avatarImage: makeResolvedImage('https://assets.example.test/m.jpg', 'Η Μαρία γελά') }])

    expect(wrapper.get('img').attributes('alt')).toBe('Η Μαρία γελά')
  })

  it('names the photograph by the person when the asset has no description', async () => {
    const wrapper = await mountReviews([{ ...QUOTE, avatarImage: makeResolvedImage('https://assets.example.test/m.jpg') }])

    expect(wrapper.get('img').attributes('alt')).toBe('Μαρία')
  })

  it('draws the initial when the photograph is gone', async () => {
    const wrapper = await mountReviews([{ ...QUOTE, avatarImage: { status: 'missing' } }])

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Μ')
  })
})
