import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { ResolvedImage } from '~~/shared/types/builderData'
import { setTenant } from '~~/test/helpers/tenant'
import { makeResolvedImage } from '~~/test/fixtures/media'
import Testimonials from '~/components/PageSection/Testimonials.vue'

type Item = { name: string, text: string, avatarImage?: ResolvedImage }

const mountReviews = (items: Item[]) => mountSuspended(Testimonials, { route: false, props: { items } })
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
    expect(wrapper.get('[data-slot="fallback"]').text()).toBe('Μ')
  })

  it('draws a library photograph through the media service, never IPX', async () => {
    useRuntimeConfig().public.mediaStreamPath = 'https://assets.platform.test/media_stream-image'
    setTenant({ assetsDomain: '' })
    const wrapper = await mountReviews([{ ...QUOTE, avatarImage: makeResolvedImage('media/shop/uploads/builder/maria.jpg', 'Η Μαρία') }])

    const src = wrapper.get('img').attributes('src')
    expect(src).toContain('https://assets.platform.test/media_stream-image/media/shop/uploads/builder/maria.jpg/80/80/')
    expect(src).not.toContain('/_ipx/')
  })

  it('draws a photograph that is not in the library by its own address, as before', async () => {
    const wrapper = await mountReviews([{ ...QUOTE, avatarImage: makeResolvedImage('https://assets.example.test/m.jpg') }])

    expect(wrapper.get('img').attributes('src')).toContain('assets.example.test/m.jpg')
  })
})
