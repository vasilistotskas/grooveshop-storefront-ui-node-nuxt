import * as z from 'zod'

/**
 * Per-section props contracts for the page builder.
 *
 * ``PageSection.props`` is admin-authored JSON; the page-config server
 * route (``server/api/page-config/[pageType].get.ts``) ``safeParse``s it
 * against the matching schema and ships ONLY the parsed output — unknown
 * keys are stripped, so layout data can never inject arbitrary
 * props/class/style into a section component. That route is the single
 * producer of ``PageSection`` data (SSR payload and client-side nav both
 * go through it), which is why this lives in ``server/utils`` rather
 * than ``shared/``: validating at the proxy keeps zod out of the client
 * bundle entirely (67KB minified, measured in the 2026-08-29 eager-graph
 * audit) and runs the parse once per SWR cache window instead of on
 * every render.
 *
 * The schemas themselves are Django's: ``page_config/schemas.py`` is the
 * one definition, published per section type in the OpenAPI schema as
 * ``PageSection<Type>Props`` and generated into ``shared/openapi``. The
 * map is keyed by the generated ``ComponentTypeEnum``, so a section type
 * Django adds fails the type check here until it has an entry.
 */

/**
 * Django requires a badge to carry a mark — ``anyOf: [{required:
 * [imageUrl]}, {required: [icon]}]`` on the item. The zod generator
 * renders that ``anyOf`` as ``z.intersection(z.unknown(), item)``, which
 * neither enforces the rule nor strips: the ``unknown`` side passes the
 * raw object through, unknown keys included. So the badge is the
 * generated item shape (the right-hand side of that intersection) with
 * the rule restated, and ``max(12)`` restated from the same schema.
 */
const zTrustBadge = zPageSectionTrustBadgesProps.shape.items
  .unwrap()
  .element
  .def
  .right
  .refine(
    badge => !!badge.imageUrl || !!badge.icon,
    { message: 'needs imageUrl or icon' },
  )

export const pageSectionPropsSchemas = {
  hero_banner: zPageSectionHeroBannerProps,
  hero_carousel: zPageSectionHeroCarouselProps,
  products_slider: zPageSectionProductsSliderProps,
  products_grid: zPageSectionProductsGridProps,
  featured_products: zPageSectionFeaturedProductsProps,
  product_categories: zPageSectionProductCategoriesProps,
  blog_categories: zPageSectionBlogCategoriesProps,
  blog_posts_carousel: zPageSectionBlogPostsCarouselProps,
  blog_posts_grid: zPageSectionBlogPostsGridProps,
  blog_posts_list: zPageSectionBlogPostsListProps,
  recently_viewed: zPageSectionRecentlyViewedProps,
  rich_text: zPageSectionRichTextProps,
  cta_banner: zPageSectionCtaBannerProps,
  newsletter_signup: zPageSectionNewsletterSignupProps,
  testimonials: zPageSectionTestimonialsProps,
  about_content: zPageSectionAboutContentProps,
  vision_content: zPageSectionVisionContentProps,
  what_is_microlearning: zPageSectionWhatIsMicrolearningProps,
  why_microlearning: zPageSectionWhyMicrolearningProps,
  spacer: zPageSectionSpacerProps,
  divider: zPageSectionDividerProps,
  loyalty_hero: zPageSectionLoyaltyHeroProps,
  search_bar: zPageSectionSearchBarProps,
  business_hours: zPageSectionBusinessHoursProps,
  location_map: zPageSectionLocationMapProps,
  features_grid: zPageSectionFeaturesGridProps,
  media_text: zPageSectionMediaTextProps,
  image_gallery: zPageSectionImageGalleryProps,
  story_timeline: zPageSectionStoryTimelineProps,
  faq: zPageSectionFaqProps,
  trust_badges: zPageSectionTrustBadgesProps.extend({
    items: z.array(zTrustBadge).max(12).optional(),
  }),
  offers_preview: zPageSectionOffersPreviewProps,
  stats_strip: zPageSectionStatsStripProps,
  partner_strip: zPageSectionPartnerStripProps,
  pull_quote: zPageSectionPullQuoteProps,
  reference_cards: zPageSectionReferenceCardsProps,
  page_hero: zPageSectionPageHeroProps,
  feature_lists: zPageSectionFeatureListsProps,
  option_selector: zPageSectionOptionSelectorProps,
  comparison_table: zPageSectionComparisonTableProps,
  flow_steps: zPageSectionFlowStepsProps,
  project_register: zPageSectionProjectRegisterProps,
  vendor_cards: zPageSectionVendorCardsProps,
  contact_panel: zPageSectionContactPanelProps,
} satisfies Record<ComponentTypeEnum, z.ZodType>

/**
 * Parse a section's admin-authored props. Returns ONLY validated keys;
 * an invalid section gets an empty object, so its component renders its
 * defaults.
 */
export function parseSectionProps(
  componentType: ComponentTypeEnum,
  props: unknown,
): { props: Record<string, unknown>, error?: string } {
  const parsed = pageSectionPropsSchemas[componentType].safeParse(props ?? {})
  if (parsed.success) {
    return { props: parsed.data as Record<string, unknown> }
  }
  return {
    props: {},
    error: parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; '),
  }
}
