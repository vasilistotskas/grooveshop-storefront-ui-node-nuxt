import type { AsyncComponentLoader } from 'vue'
import { defineAsyncComponent, hydrateOnIdle, hydrateOnVisible } from 'vue'

/**
 * Page-builder section registry.
 *
 * Keys are Django ``ComponentType`` values, optionally suffixed
 * ``@<tenant-schema>`` for tenant-specific VARIANTS — ordinary
 * shared-bundle components under ``PageSection/variants/<schema>/``,
 * registered here under the suffixed key. ``defineAsyncComponent``
 * makes every entry its own lazy chunk, so a tenant never downloads
 * another tenant's variant (or any section its layout doesn't use).
 *
 * Hydration strategies (Vue 3.5 lazy hydration — the Renderer mounts
 * sections via ``<component :is>``, so Nuxt's template-level
 * ``hydrate-on-visible`` prop does not apply here):
 *
 * - ``eagerSection`` — heroes only. They are the LCP / above-the-fold
 *   content; per Nuxt guidance critical in-viewport content should not
 *   defer hydration.
 * - ``lazySection`` — ``hydrateOnVisible``: a page-builder page renders
 *   many sections but the visitor sees one screenful; deferring
 *   below-the-fold hydration cut the homepage's mobile main-thread work
 *   (PSI mobile 67, 2026-08-28 pass). The 250px rootMargin hydrates a
 *   section just before it scrolls into view. NOTE (verified against
 *   @vue/runtime-core 3.5.41): the chunk still DOWNLOADS eagerly —
 *   only the hydration walk (render + reactivity + listeners) defers.
 * - ``idleSection`` — ``hydrateOnIdle`` for sections whose SSR output
 *   can be an empty comment node (client-only data): Vue's
 *   ``hydrateOnVisible`` observes only real Elements, so an empty
 *   section would NEVER hydrate under it (verified in the 3.5.41
 *   source: ``forEach((el) => { if (!(el instanceof Element)) return; … })``).
 */
const eagerSection = (loader: AsyncComponentLoader) => defineAsyncComponent(loader)
const lazySection = (loader: AsyncComponentLoader) => defineAsyncComponent({
  loader,
  hydrate: hydrateOnVisible({ rootMargin: '250px' }),
})
const idleSection = (loader: AsyncComponentLoader) => defineAsyncComponent({
  loader,
  hydrate: hydrateOnIdle(),
})

export const componentRegistry: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'hero_banner': eagerSection(() => import('~/components/PageSection/HeroBanner.vue')),
  'hero_carousel': eagerSection(() => import('~/components/PageSection/HeroCarousel.vue')),
  'products_slider': lazySection(() => import('~/components/PageSection/ProductsSlider.vue')),
  'products_grid': lazySection(() => import('~/components/PageSection/ProductsGrid.vue')),
  'featured_products': lazySection(() => import('~/components/PageSection/FeaturedProducts.vue')),
  'product_categories': lazySection(() => import('~/components/PageSection/ProductCategories.vue')),
  'blog_categories': lazySection(() => import('~/components/PageSection/BlogCategories.vue')),
  'blog_posts_carousel': lazySection(() => import('~/components/PageSection/BlogPostsCarousel.vue')),
  'blog_posts_grid': lazySection(() => import('~/components/PageSection/BlogPostsGrid.vue')),
  'blog_posts_list': lazySection(() => import('~/components/PageSection/BlogPostsList.vue')),
  // SSR renders nothing (history lives in localStorage) — see idleSection.
  'recently_viewed': idleSection(() => import('~/components/PageSection/RecentlyViewed.vue')),
  'rich_text': lazySection(() => import('~/components/PageSection/RichText.vue')),
  'cta_banner': lazySection(() => import('~/components/PageSection/CtaBanner.vue')),
  'newsletter_signup': lazySection(() => import('~/components/PageSection/NewsletterSignup.vue')),
  'testimonials': lazySection(() => import('~/components/PageSection/Testimonials.vue')),
  'spacer': lazySection(() => import('~/components/PageSection/Spacer.vue')),
  'divider': lazySection(() => import('~/components/PageSection/Divider.vue')),
  'loyalty_hero': lazySection(() => import('~/components/PageSection/LoyaltyHero.vue')),
  'search_bar': lazySection(() => import('~/components/PageSection/SearchBar.vue')),
  'business_hours': lazySection(() => import('~/components/PageSection/BusinessHours.vue')),
  'location_map': lazySection(() => import('~/components/PageSection/LocationMap.vue')),
  'features_grid': lazySection(() => import('~/components/PageSection/FeaturesGrid.vue')),
  'media_text': lazySection(() => import('~/components/PageSection/MediaText.vue')),
  'image_gallery': lazySection(() => import('~/components/PageSection/ImageGallery.vue')),
  'story_timeline': lazySection(() => import('~/components/PageSection/StoryTimeline.vue')),
  'faq': lazySection(() => import('~/components/PageSection/Faq.vue')),

  // Δelta Σigma tenant variants — the redesign's bands. Each replaces
  // the generic rendering of a section type the layout already
  // carries, so the layout DATA stays portable and only the
  // presentation is per-tenant. `partner_strip` has no base entry yet:
  // it is a real section type with a props contract, but the only
  // design that asks for one is this tenant's, and a platform-generic
  // logo strip nobody renders would be speculative.
  'hero_banner@delta_sigma': eagerSection(() => import('~/components/PageSection/variants/delta_sigma/Hero.vue')),
  'partner_strip@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/PartnerStrip.vue')),
  'media_text@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/MediaText.vue')),
  'features_grid@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/FeaturesGrid.vue')),
  'story_timeline@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/StoryTimeline.vue')),
  'cta_banner@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/CtaBanner.vue')),
  'pull_quote@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/PullQuote.vue')),
  'reference_cards@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/ReferenceCards.vue')),
  // Eager: a page hero is the LCP of every inner page.
  'page_hero@delta_sigma': eagerSection(() => import('~/components/PageSection/variants/delta_sigma/PageHero.vue')),
  'feature_lists@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/FeatureLists.vue')),
  'option_selector@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/OptionSelector.vue')),
  'comparison_table@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/ComparisonTable.vue')),
  'flow_steps@delta_sigma': lazySection(() => import('~/components/PageSection/variants/delta_sigma/FlowSteps.vue')),

  // webside tenant variants — full-page marketing/content sections with
  // no props. Base (non-variant) entries deliberately do NOT exist for
  // these componentTypes: a tenant without a published layout for them
  // renders nothing (see usePageConfig's FALLBACK_LAYOUTS).
  'about_content@webside': lazySection(() => import('~/components/PageSection/variants/webside/AboutContent.vue')),
  'vision_content@webside': lazySection(() => import('~/components/PageSection/variants/webside/VisionContent.vue')),
  'what_is_microlearning@webside': lazySection(() => import('~/components/PageSection/variants/webside/WhatIsMicrolearning.vue')),
  'why_microlearning@webside': lazySection(() => import('~/components/PageSection/variants/webside/WhyMicrolearning.vue')),
}

/**
 * Resolve a section component with the tenant-variant fallback chain:
 * ``<type>@<tenantSchema>`` → ``<type>`` → undefined (skipped by the
 * Renderer). The section's ``component_type`` stays generic in the
 * layout data — which RENDERING a tenant gets is a presentation
 * concern resolved here at runtime.
 */
export function resolveSectionComponent(
  componentType: string,
  tenantSchema?: string | null,
) {
  return (
    (tenantSchema && componentRegistry[`${componentType}@${tenantSchema}`])
    || componentRegistry[componentType]
  )
}
