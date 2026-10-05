import { describe, expect, it } from 'vitest'

import {
  pageSectionPropsSchemas,
  parseSectionProps,
} from '../../../../server/utils/pageSectionProps'
import { zComponentTypeEnum } from '../../../../shared/openapi/zod.gen'

/**
 * The page-config route ships ONLY what these schemas parse, so a prop
 * the schema does not know is stripped before it reaches a component —
 * silently, with the section rendering its defaults instead. The
 * schemas are generated from Django's `page_config/schemas.py`, so
 * these tests pin the storefront-side properties: every type Django can
 * send has one, unknown keys never survive, and the rules the generator
 * cannot express still hold.
 */

describe('the prop contract covers every section Django can send', () => {
  it('has a schema for exactly the generated section types', () => {
    expect(Object.keys(pageSectionPropsSchemas).sort())
      .toEqual([...zComponentTypeEnum.options].sort())
  })

  it('answers {} for a section that configures nothing', () => {
    expect(parseSectionProps('about_content', {})).toEqual({ props: {} })
  })

  it('refuses props on a section that takes none', () => {
    // Django's contract for these is an object with no keys, and its
    // write boundary enforces it — a stray key is a fault worth a log.
    const { props, error } = parseSectionProps('about_content', { anything: 1 })

    expect(props).toEqual({})
    expect(error).toContain('anything')
  })
})

describe('a product rail says what it draws', () => {
  it.each(['products_slider', 'products_grid', 'featured_products'] as const)(
    '%s keeps heading, CTA, ordering and category',
    (type) => {
      const { props, error } = parseSectionProps(type, {
        heading: 'Νέες αφίξεις',
        subheading: 'Ό,τι μπήκε αυτή την εβδομάδα',
        ctaText: 'Δες τα όλα',
        ctaLink: '/products',
        ordering: 'newest',
        categoryId: 3,
        showAddToCart: true,
        pageSize: 8,
      })

      expect(error).toBeUndefined()
      expect(props).toMatchObject({
        heading: 'Νέες αφίξεις',
        ordering: 'newest',
        categoryId: 3,
        showAddToCart: true,
      })
    },
  )

  it('rejects an ordering it cannot apply', () => {
    const { props, error } = parseSectionProps('products_slider', {
      ordering: 'cheapest',
    })

    expect(error).toContain('ordering')
    expect(props).toEqual({})
  })

  it('keeps each rail its own page-size ceiling', () => {
    expect(parseSectionProps('products_grid', { pageSize: 48 }).error)
      .toBeUndefined()
    expect(parseSectionProps('products_slider', { pageSize: 48 }).error)
      .toContain('pageSize')
  })
})

describe('a hero slide carries its own copy and destination', () => {
  it('parses a full slide', () => {
    const { props, error } = parseSectionProps('hero_carousel', {
      slides: [
        {
          imageUrl: '/img/sale.avif',
          mobileImageUrl: '/img/sale-mobile.avif',
          alt: 'Προσφορές',
          heading: 'Έκπτωση 20%',
          ctaText: 'Δες τα',
          ctaLink: '/offers',
        },
      ],
      autoplayMs: 6000,
      aspect: 'wide',
    })

    expect(error).toBeUndefined()
    expect((props.slides as unknown[])).toHaveLength(1)
  })

  it('strips the retired slide theme', () => {
    // The copy sits beside the artwork, never over it, so a stored
    // `theme` from before that change is dropped rather than shipped.
    const { props, error } = parseSectionProps('hero_carousel', {
      slides: [{ imageUrl: '/img/sale.avif', theme: 'dark' }],
    })

    expect(error).toBeUndefined()
    expect((props.slides as Record<string, unknown>[])[0]).not.toHaveProperty('theme')
  })

  it('refuses a slide with no artwork', () => {
    const { error } = parseSectionProps('hero_carousel', {
      slides: [{ heading: 'Χωρίς εικόνα' }],
    })

    expect(error).toContain('slides')
  })

  it('accepts autoplay off, refuses an unreadable interval', () => {
    expect(parseSectionProps('hero_carousel', { autoplayMs: 0 }).error)
      .toBeUndefined()
    expect(parseSectionProps('hero_carousel', { autoplayMs: 800 }).error)
      .toContain('autoplayMs')
  })
})

describe('a hero slide can name a product for its chip', () => {
  it('keeps the productId', () => {
    const { props, error } = parseSectionProps('hero_carousel', {
      slides: [{ imageUrl: '/img/sale.avif', productId: 42 }],
    })

    expect(error).toBeUndefined()
    expect((props.slides as Record<string, unknown>[])[0]).toMatchObject({ productId: 42 })
  })

  it.each([0, -3, 1.5, '42'])('refuses a productId of %s', (productId) => {
    const { error } = parseSectionProps('hero_carousel', {
      slides: [{ imageUrl: '/img/sale.avif', productId }],
    })

    expect(error).toContain('productId')
  })
})

describe('the home bands carry the props the design draws them with', () => {
  it('keeps the eyebrow and ink surface of the offers band', () => {
    const { props, error } = parseSectionProps('offers_preview', { eyebrow: 'Προσφορές', surface: 'ink' })

    expect(error).toBeUndefined()
    expect(props).toEqual({ eyebrow: 'Προσφορές', surface: 'ink' })
  })

  it('keeps the wording, routes and surface of the rewards band', () => {
    const value = {
      surface: 'muted',
      eyebrow: 'Λέσχη',
      ctaText: 'Μπες',
      ctaLink: '/account/signup',
      secondaryCtaText: 'Όροι',
      secondaryCtaLink: '/legal/rewards',
    }

    expect(parseSectionProps('loyalty_hero', value)).toEqual({ props: value })
  })

  it('refuses a rewards route that leaves the store', () => {
    expect(parseSectionProps('loyalty_hero', { ctaLink: 'http://evil.test' }).error)
      .toContain('ctaLink')
  })
})

describe('a trust badge needs a mark', () => {
  it('parses logos and icons', () => {
    const { props, error } = parseSectionProps('trust_badges', {
      items: [
        { kind: 'payment', label: 'Viva Wallet', imageUrl: '/img/viva.svg' },
        { kind: 'ai', label: 'AI-ready', icon: 'i-heroicons-cpu-chip' },
      ],
      marquee: false,
    })

    expect(error).toBeUndefined()
    expect(props.items).toHaveLength(2)
  })

  it('strips unknown keys from a badge', () => {
    // The generator renders Django's anyOf on the item as an
    // intersection with `unknown`, which passes the raw object through.
    const { props, error } = parseSectionProps('trust_badges', {
      items: [
        { kind: 'payment', label: 'Visa', icon: 'i-x', onclick: 'alert(1)', class: 'fixed' },
      ],
    })

    expect(error).toBeUndefined()
    expect(props.items).toEqual([{ kind: 'payment', label: 'Visa', icon: 'i-x' }])
  })

  it('refuses a badge that is only a word', () => {
    const { error } = parseSectionProps('trust_badges', {
      items: [{ kind: 'custom', label: 'Εγγύηση' }],
    })

    expect(error).toContain('imageUrl or icon')
  })
})

describe('a testimonial can be attributed and rated', () => {
  it('keeps the role and a five-point rating', () => {
    const { props, error } = parseSectionProps('testimonials', {
      heading: 'Τι λένε οι πελάτες μας',
      items: [
        { name: 'Γιώργος Π.', text: 'Άψογα.', role: 'Χονδρική', rating: 5 },
      ],
    })

    expect(error).toBeUndefined()
    expect(props.items).toEqual([
      { name: 'Γιώργος Π.', text: 'Άψογα.', role: 'Χονδρική', rating: 5 },
    ])
  })

  it('refuses the 1..10 scale the API stores reviews on', () => {
    const { error } = parseSectionProps('testimonials', {
      items: [{ name: 'Α', text: 'Β', rating: 9 }],
    })

    expect(error).toContain('rating')
  })
})

describe('unknown keys never reach a component', () => {
  it('strips them rather than failing the section', () => {
    const { props, error } = parseSectionProps('cta_banner', {
      heading: 'Δωρεάν αποστολή',
      onclick: 'alert(1)',
      class: 'absolute inset-0',
    })

    expect(error).toBeUndefined()
    expect(props).toEqual({ heading: 'Δωρεάν αποστολή' })
  })
})
