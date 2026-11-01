import * as z from 'zod'
import type { ComponentTypeEnum } from '~~/shared/openapi/types.gen'
import {
  zPageSectionAboutContentProps,
  zPageSectionBlogCategoriesProps,
  zPageSectionBlogPostsCarouselProps,
  zPageSectionBlogPostsGridProps,
  zPageSectionBlogPostsListProps,
  zPageSectionBusinessHoursProps,
  zPageSectionComparisonTableProps,
  zPageSectionContactPanelProps,
  zPageSectionCtaBannerProps,
  zPageSectionDividerProps,
  zPageSectionFaqProps,
  zPageSectionFeatureListsProps,
  zPageSectionFeaturedProductsProps,
  zPageSectionFeaturesGridProps,
  zPageSectionFlowStepsProps,
  zPageSectionHeroBannerProps,
  zPageSectionHeroCarouselProps,
  zPageSectionImageGalleryProps,
  zPageSectionLocationMapProps,
  zPageSectionLoyaltyHeroProps,
  zPageSectionMediaTextProps,
  zPageSectionNewsletterSignupProps,
  zPageSectionOffersPreviewProps,
  zPageSectionOptionSelectorProps,
  zPageSectionPageHeroProps,
  zPageSectionPartnerStripProps,
  zPageSectionProductCategoriesProps,
  zPageSectionProductsGridProps,
  zPageSectionProductsSliderProps,
  zPageSectionProjectRegisterProps,
  zPageSectionPullQuoteProps,
  zPageSectionRecentlyViewedProps,
  zPageSectionReferenceCardsProps,
  zPageSectionRichTextProps,
  zPageSectionSearchBarProps,
  zPageSectionSpacerProps,
  zPageSectionStatsStripProps,
  zPageSectionStoryTimelineProps,
  zPageSectionTestimonialsProps,
  zPageSectionTrustBadgesProps,
  zPageSectionVendorCardsProps,
  zPageSectionVisionContentProps,
  zPageSectionWhatIsMicrolearningProps,
  zPageSectionWhyMicrolearningProps,
} from '~~/shared/openapi/zod.gen'

/**
 * What a section's props were, before the builder: the per-type contracts
 * `page_config` held, parsed the way the page-config route parsed them.
 *
 * Kept ONLY as the oracle of the port proof
 * (`test/unit/server/utils/builderPortFixtures.spec.ts`): the props a legacy
 * section gave its component must equal what the converted block gives it
 * through `sectionProps`. Nothing renders through it any more. It goes with
 * the converter and its fixtures once every store is imported, and cannot
 * outlive the generated `PageSection*Props` it is built from.
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
