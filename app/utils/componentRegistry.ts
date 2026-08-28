/**
 * Page-builder section registry.
 *
 * Keys are Django ``ComponentType`` values, optionally suffixed
 * ``@<tenant-schema>`` for tenant-specific VARIANTS — ordinary
 * shared-bundle components under ``PageSection/variants/<schema>/``,
 * registered here under the suffixed key. ``defineAsyncComponent``
 * makes every entry its own lazy chunk, so a tenant never downloads
 * another tenant's variant (or any section its layout doesn't use).
 */
export const componentRegistry: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'hero_banner': defineAsyncComponent(() => import('~/components/PageSection/HeroBanner.vue')),
  'hero_carousel': defineAsyncComponent(() => import('~/components/PageSection/HeroCarousel.vue')),
  'products_slider': defineAsyncComponent(() => import('~/components/PageSection/ProductsSlider.vue')),
  'products_grid': defineAsyncComponent(() => import('~/components/PageSection/ProductsGrid.vue')),
  'featured_products': defineAsyncComponent(() => import('~/components/PageSection/FeaturedProducts.vue')),
  'product_categories': defineAsyncComponent(() => import('~/components/PageSection/ProductCategories.vue')),
  'blog_categories': defineAsyncComponent(() => import('~/components/PageSection/BlogCategories.vue')),
  'blog_posts_carousel': defineAsyncComponent(() => import('~/components/PageSection/BlogPostsCarousel.vue')),
  'blog_posts_grid': defineAsyncComponent(() => import('~/components/PageSection/BlogPostsGrid.vue')),
  'blog_posts_list': defineAsyncComponent(() => import('~/components/PageSection/BlogPostsList.vue')),
  'recently_viewed': defineAsyncComponent(() => import('~/components/PageSection/RecentlyViewed.vue')),
  'rich_text': defineAsyncComponent(() => import('~/components/PageSection/RichText.vue')),
  'cta_banner': defineAsyncComponent(() => import('~/components/PageSection/CtaBanner.vue')),
  'newsletter_signup': defineAsyncComponent(() => import('~/components/PageSection/NewsletterSignup.vue')),
  'testimonials': defineAsyncComponent(() => import('~/components/PageSection/Testimonials.vue')),
  'spacer': defineAsyncComponent(() => import('~/components/PageSection/Spacer.vue')),
  'divider': defineAsyncComponent(() => import('~/components/PageSection/Divider.vue')),
  'loyalty_hero': defineAsyncComponent(() => import('~/components/PageSection/LoyaltyHero.vue')),
  'search_bar': defineAsyncComponent(() => import('~/components/PageSection/SearchBar.vue')),
  'business_hours': defineAsyncComponent(() => import('~/components/PageSection/BusinessHours.vue')),
  'location_map': defineAsyncComponent(() => import('~/components/PageSection/LocationMap.vue')),
  'features_grid': defineAsyncComponent(() => import('~/components/PageSection/FeaturesGrid.vue')),
  'media_text': defineAsyncComponent(() => import('~/components/PageSection/MediaText.vue')),
  'image_gallery': defineAsyncComponent(() => import('~/components/PageSection/ImageGallery.vue')),
  'story_timeline': defineAsyncComponent(() => import('~/components/PageSection/StoryTimeline.vue')),
  'faq': defineAsyncComponent(() => import('~/components/PageSection/Faq.vue')),

  // webside tenant variants — full-page marketing/content sections with
  // no props. Base (non-variant) entries deliberately do NOT exist for
  // these componentTypes: a tenant without a published layout for them
  // renders nothing (see usePageConfig's FALLBACK_LAYOUTS).
  'about_content@webside': defineAsyncComponent(() => import('~/components/PageSection/variants/webside/AboutContent.vue')),
  'vision_content@webside': defineAsyncComponent(() => import('~/components/PageSection/variants/webside/VisionContent.vue')),
  'what_is_microlearning@webside': defineAsyncComponent(() => import('~/components/PageSection/variants/webside/WhatIsMicrolearning.vue')),
  'why_microlearning@webside': defineAsyncComponent(() => import('~/components/PageSection/variants/webside/WhyMicrolearning.vue')),
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
