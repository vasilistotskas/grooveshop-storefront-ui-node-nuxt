import * as z from 'zod'

/**
 * Per-section props contracts for the page builder.
 *
 * ``PageSection.props`` is admin-authored JSON; the Renderer
 * ``safeParse``s it against the matching schema and v-binds ONLY the
 * parsed output — unknown keys are stripped, so layout data can never
 * inject arbitrary props/class/style into a section component. Django
 * mirrors these shapes at the write boundary
 * (``page_config/schemas.py``) so typos surface to the admin instead
 * of silently rendering defaults.
 *
 * Keep keys camelCase — Django stores snake_case and the API layer
 * camelizes on the wire.
 */

const zInternalPath = z.string().regex(/^\//, 'must be an internal path')
const zLink = z.union([zInternalPath, z.string().regex(/^https:\/\//)])

export const pageSectionPropsSchemas: Record<string, z.ZodTypeAny> = {
  hero_banner: z
    .object({
      heading: z.string().max(200),
      subheading: z.string().max(500),
      eyebrow: z.string().max(100),
      imageUrl: z.string().max(1000),
      ctaText: z.string().max(100),
      ctaLink: zLink,
      secondaryCtaText: z.string().max(100),
      secondaryCtaLink: zLink,
      overlayOpacity: z.number().min(0).max(1),
      decor: z.enum(['none', 'orbs', 'gradient']),
    })
    .partial()
    .strip(),
  hero_carousel: z
    .object({
      images: z.array(z.string().max(1000)).max(10),
      mobileImages: z.array(z.string().max(1000)).max(10),
      link: zLink,
    })
    .partial()
    .strip(),
  products_slider: z
    .object({ pageSize: z.number().int().min(1).max(24) })
    .partial()
    .strip(),
  products_grid: z
    .object({ pageSize: z.number().int().min(1).max(48) })
    .partial()
    .strip(),
  featured_products: z
    .object({
      pageSize: z.number().int().min(1).max(24),
      columns: z.number().int().min(1).max(6),
    })
    .partial()
    .strip(),
  product_categories: z.object({}).partial().strip(),
  blog_categories: z.object({}).partial().strip(),
  blog_posts_carousel: z
    .object({ count: z.number().int().min(1).max(12) })
    .partial()
    .strip(),
  blog_posts_grid: z
    .object({ count: z.number().int().min(1).max(24) })
    .partial()
    .strip(),
  blog_posts_list: z
    .object({ pageSize: z.number().int().min(1).max(24) })
    .partial()
    .strip(),
  recently_viewed: z.object({}).partial().strip(),
  rich_text: z
    .object({ content: z.string().max(20000) })
    .partial()
    .strip(),
  cta_banner: z
    .object({
      heading: z.string().max(200),
      description: z.string().max(1000),
      buttonText: z.string().max(100),
      buttonLink: zLink,
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    })
    .partial()
    .strip(),
  newsletter_signup: z
    .object({
      heading: z.string().max(200),
      description: z.string().max(1000),
      placeholder: z.string().max(100),
    })
    .partial()
    .strip(),
  testimonials: z
    .object({
      items: z
        .array(
          z
            .object({
              name: z.string().max(100),
              text: z.string().max(1000),
              avatar: z.string().max(1000).optional(),
            })
            .strip(),
        )
        .max(20),
    })
    .partial()
    .strip(),
  spacer: z
    .object({ height: z.enum(['sm', 'md', 'lg', 'xl']) })
    .partial()
    .strip(),
  divider: z
    .object({ variant: z.enum(['line', 'thread']) })
    .partial()
    .strip(),
  loyalty_hero: z.object({}).partial().strip(),
  search_bar: z.object({}).partial().strip(),
  // Weekly schedule + open/closed badge — data comes from the
  // BUSINESS_HOURS extra_setting (useBusinessHours), so no props.
  business_hours: z.object({}).partial().strip(),
  location_map: z
    .object({
      embedUrl: z.string().max(1000).regex(/^https:\/\//),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().max(300),
    })
    .partial()
    .strip(),
  features_grid: z
    .object({
      heading: z.string().max(200),
      items: z
        .array(
          z
            .object({
              title: z.string().max(100),
              text: z.string().max(500).optional(),
              icon: z.string().max(100).regex(/^i-[a-z0-9:-]+$/).optional(),
            })
            .strip(),
        )
        .max(12),
      columns: z.number().int().min(1).max(4),
      decor: z.enum(['none', 'gradient_tiles']),
    })
    .partial()
    .strip(),
  media_text: z
    .object({
      heading: z.string().max(200),
      body: z.string().max(5000),
      imageUrl: z.string().max(1000),
      imagePosition: z.enum(['left', 'right']),
      ctaText: z.string().max(100),
      ctaLink: zLink,
      decor: z.enum(['none', 'orbs', 'gradient']),
    })
    .partial()
    .strip(),
  image_gallery: z
    .object({
      items: z
        .array(
          z
            .object({
              src: z.string().max(1000),
              alt: z.string().max(200),
              caption: z.string().max(200).optional(),
            })
            .strip(),
        )
        .max(24),
      columns: z.number().int().min(2).max(4),
    })
    .partial()
    .strip(),
}

/**
 * Parse a section's admin-authored props. Returns ONLY validated keys;
 * unknown componentTypes get an empty object (the Renderer already
 * skips unregistered components).
 */
export function parseSectionProps(
  componentType: string,
  props: unknown,
): { props: Record<string, unknown>, error?: string } {
  const schema = pageSectionPropsSchemas[componentType]
  if (!schema) return { props: {} }
  const parsed = schema.safeParse(props ?? {})
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
