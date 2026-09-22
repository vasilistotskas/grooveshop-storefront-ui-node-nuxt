import { describe, expect, it } from 'vitest'

import {
  pageSectionPropsSchemas,
  parseSectionProps,
} from '../../../../server/utils/pageSectionProps'

/**
 * The page-config route ships ONLY what these schemas parse, so a prop
 * the schema does not know is stripped before it reaches a component —
 * silently, with the section rendering its defaults instead. That makes
 * this file's agreement with Django's `page_config/schemas.py` a
 * correctness property rather than housekeeping.
 *
 * The lockstep test below reads the generated `ComponentTypeEnum`,
 * which IS Django's list of section types, so a type added on the
 * backend without a schema here fails in CI rather than in a merchant's
 * layout.
 */

/** Every section type Django knows, from the generated OpenAPI types. */
const DJANGO_SECTION_TYPES: ComponentTypeEnum[] = [
  'hero_banner',
  'hero_carousel',
  'products_slider',
  'products_grid',
  'featured_products',
  'product_categories',
  'blog_categories',
  'blog_posts_carousel',
  'blog_posts_grid',
  'blog_posts_list',
  'recently_viewed',
  'rich_text',
  'cta_banner',
  'newsletter_signup',
  'testimonials',
  'about_content',
  'vision_content',
  'what_is_microlearning',
  'why_microlearning',
  'spacer',
  'divider',
  'loyalty_hero',
  'search_bar',
  'business_hours',
  'location_map',
  'features_grid',
  'media_text',
  'image_gallery',
  'story_timeline',
  'faq',
  'trust_badges',
  'offers_preview',
  'stats_strip',
  'partner_strip',
  'pull_quote',
  'reference_cards',
  'page_hero',
  'feature_lists',
  'option_selector',
  'comparison_table',
  'flow_steps',
  'project_register',
  'vendor_cards',
  'contact_panel',
]

/**
 * Sections whose rendering takes NO props at all: the four brand pages
 * whose markup lives entirely in a tenant variant component. They have
 * no schema on purpose — `parseSectionProps` answers `{}` for an
 * unknown type, which is exactly right for a section that has nothing
 * to configure.
 */
const PROPLESS_SECTIONS = new Set<string>([
  'about_content',
  'vision_content',
  'what_is_microlearning',
  'why_microlearning',
])

describe('the prop contract covers every section Django can send', () => {
  it('lists the same section types the generated OpenAPI enum does', () => {
    // Guards the guard: if Django gains a type, `pnpm openapi-ts`
    // regenerates the enum and this array has to grow with it, which is
    // what makes the next assertion meaningful.
    const fromSchemas = Object.keys(pageSectionPropsSchemas)
    const unknown = fromSchemas.filter(
      type => !DJANGO_SECTION_TYPES.includes(type as ComponentTypeEnum),
    )
    expect(unknown, 'schemas for types Django does not have').toEqual([])
  })

  it.each(DJANGO_SECTION_TYPES.filter(type => !PROPLESS_SECTIONS.has(type)))(
    '%s has a schema, so its props are not stripped',
    (type) => {
      expect(pageSectionPropsSchemas[type]).toBeDefined()
    },
  )

  it('answers {} for a section that configures nothing', () => {
    for (const type of PROPLESS_SECTIONS) {
      expect(parseSectionProps(type, { anything: 1 })).toEqual({ props: {} })
    }
  })
})

describe('a product rail says what it draws', () => {
  it.each(['products_slider', 'products_grid', 'featured_products'])(
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
