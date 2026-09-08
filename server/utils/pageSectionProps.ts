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
 * every render. Django mirrors these shapes at the write boundary
 * (``page_config/schemas.py``) so typos surface to the admin instead of
 * silently rendering defaults.
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
      // The proof row under the copy. `value` is TEXT, not a number:
      // the row prints "50+" and "1.842" as readily as a bare integer.
      stats: z
        .array(
          z
            .object({
              value: z.string().min(1).max(12),
              label: z.string().min(1).max(80),
            })
            .strip(),
        )
        .max(4),
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
      // WHICH page surface the band paints — an enum, not a colour.
      surface: z.enum(['default', 'muted']),
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
  partner_strip: z
    .object({
      label: z.string().max(80),
      items: z
        .array(
          z
            .object({
              name: z.string().min(1).max(60),
              href: zLink.optional(),
            })
            .strip(),
        )
        .max(12),
    })
    .partial()
    .strip(),
  feature_lists: z
    .object({
      // Cards of "what it is / what it does", with one shared
      // footnote. `emphasis` is a SUBSTRING of `note`, not markup —
      // the same device `media_text` uses.
      heading: z.string().max(200),
      note: z.string().max(1000),
      emphasis: z.string().max(120),
      items: z
        .array(
          z
            .object({
              title: z.string().min(1).max(100),
              icon: z.string().max(100).regex(/^i-[a-z0-9:-]+$/).optional(),
              bullets: z.array(z.string().min(1).max(300)).max(8).optional(),
            })
            .strip(),
        )
        .max(4),
    })
    .partial()
    .strip(),
  option_selector: z
    .object({
      heading: z.string().max(200),
      standfirst: z.string().max(400),
      rowsLabel: z.string().max(60),
      rationaleLabel: z.string().max(60),
      bulletsLabel: z.string().max(60),
      // HOW the options are offered, and therefore where the panel
      // goes: boxed cards for variants of one product, a numbered
      // strip for a sequence, a rail for a list that IS the page's
      // subject. Each is a different component; see the base one.
      layout: z.enum(['cards', 'strip', 'rail']),
      prompt: z
        .object({
          title: z.string().min(1).max(100),
          text: z.string().max(300).optional(),
          ctaText: z.string().max(100).optional(),
          ctaLink: zLink.optional(),
        })
        .strip(),
      options: z
        .array(
          z
            .object({
              name: z.string().min(1).max(60),
              label: z.string().max(40).optional(),
              model: z.string().max(120).optional(),
              title: z.string().max(120).optional(),
              rationale: z.string().max(600).optional(),
              note: z.string().max(400).optional(),
              ctaText: z.string().max(100).optional(),
              ctaLink: zLink.optional(),
              bullets: z.array(z.string().min(1).max(200)).max(10).optional(),
              rows: z
                .array(
                  z
                    .object({
                      label: z.string().min(1).max(60),
                      value: z.string().min(1).max(120),
                    })
                    .strip(),
                )
                .max(12)
                .optional(),
            })
            .strip(),
        )
        .max(8),
    })
    .partial()
    .strip(),
  comparison_table: z
    .object({
      // One characteristic per row, one option per column. Django
      // refuses a ragged row; the storefront filters one out rather
      // than print a value under the wrong heading.
      heading: z.string().max(200),
      rowLabel: z.string().max(60),
      note: z.string().max(600),
      columns: z.array(z.string().min(1).max(60)).min(1).max(4),
      rows: z
        .array(
          z
            .object({
              label: z.string().min(1).max(60),
              values: z.array(z.string().max(120)).min(1).max(4),
            })
            .strip(),
        )
        .max(24),
    })
    .partial()
    .strip(),
  flow_steps: z
    .object({
      heading: z.string().max(200),
      body: z.string().max(600),
      items: z
        .array(
          z
            .object({
              title: z.string().min(1).max(100),
              label: z.string().max(60).optional(),
              lines: z.array(z.string().min(1).max(120)).max(8).optional(),
            })
            .strip(),
        )
        .max(4),
    })
    .partial()
    .strip(),
  vendor_cards: z
    .object({
      // A card per manufacturer: a category label, what the store does
      // with it, and the part numbers, buses and protocols as chips.
      note: z.string().max(400),
      items: z
        .array(
          z
            .object({
              title: z.string().min(1).max(60),
              label: z.string().max(60).optional(),
              text: z.string().max(600).optional(),
              tags: z.array(z.string().min(1).max(40)).max(8).optional(),
            })
            .strip(),
        )
        .max(8),
    })
    .partial()
    .strip(),
  contact_panel: z
    .object({
      // The contact page as one band. The offices are NOT here — they
      // come from the STORE_OFFICES setting, and the form's own field
      // labels live in the component, being UI rather than copy.
      eyebrow: z.string().max(100),
      heading: z.string().max(200),
      body: z.string().max(600),
      hint: z.string().max(400),
      responseTime: z.string().max(120),
      subjects: z
        .array(z.object({ label: z.string().min(1).max(40) }).strip())
        .max(6),
    })
    .partial()
    .strip(),
  project_register: z
    .object({
      // A register, not a list of articles: `items` carries every row
      // and `sectors` the taxonomy it filters by. A row's `sector` is
      // a KEY into `sectors` — Django refuses a key that isn't
      // declared there, and the storefront falls back to a neutral
      // pill rather than drop the row.
      metaLabel: z.string().max(60),
      note: z.string().max(400),
      sectors: z
        .array(
          z
            .object({
              key: z.string().min(1).max(40),
              label: z.string().min(1).max(40),
            })
            .strip(),
        )
        .max(12),
      items: z
        .array(
          z
            .object({
              sector: z.string().max(40).optional(),
              title: z.string().min(1).max(200),
              note: z.string().max(200).optional(),
              meta: z.string().max(120).optional(),
            })
            .strip(),
        )
        .max(200),
    })
    .partial()
    .strip(),
  page_hero: z
    .object({
      // The top of an inner page. `callout.tone` is an ENUM, not a
      // colour: the storefront decides what "warning" looks like from
      // its own tokens, so a page cannot carry a hex.
      eyebrow: z.string().max(100),
      heading: z.string().max(200),
      standfirst: z.string().max(300),
      body: z.string().max(1000),
      ctaText: z.string().max(100),
      ctaLink: zLink,
      secondaryCtaText: z.string().max(100),
      secondaryCtaLink: zLink,
      stats: z
        .array(
          z
            .object({
              value: z.string().min(1).max(12),
              label: z.string().min(1).max(80),
            })
            .strip(),
        )
        .max(4),
      callout: z
        .object({
          tone: z.enum(['info', 'warning', 'success']).optional(),
          title: z.string().min(1).max(100),
          text: z.string().max(400).optional(),
          note: z.string().max(160).optional(),
        })
        .strip(),
      facts: z
        .array(
          z
            .object({
              label: z.string().min(1).max(40),
              value: z.string().min(1).max(60),
            })
            .strip(),
        )
        .max(6),
    })
    .partial()
    .strip(),
  reference_cards: z
    .object({
      // A curated few of something a longer page lists in full. The
      // attribution's LABEL belongs to the band ("On behalf of") and
      // its value to the card.
      heading: z.string().max(200),
      metaLabel: z.string().max(40),
      ctaText: z.string().max(100),
      ctaLink: zLink,
      items: z
        .array(
          z
            .object({
              title: z.string().min(1).max(160),
              label: z.string().max(60).optional(),
              text: z.string().max(300).optional(),
              meta: z.string().max(80).optional(),
            })
            .strip(),
        )
        .max(6),
    })
    .partial()
    .strip(),
  pull_quote: z
    .object({
      // A stated principle with the reason under it — not a
      // testimonial, which is somebody else's words and needs an
      // attribution to mean anything.
      quote: z.string().max(300),
      text: z.string().max(1000),
      attribution: z.string().max(120),
    })
    .partial()
    .strip(),
  features_grid: z
    .object({
      heading: z.string().max(200),
      // A standfirst under the heading, for a grid whose cells are
      // framed together rather than introduced one by one.
      body: z.string().max(600),
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
      // `framed` is one bordered box of equal cells, divided by rules:
      // the parts of a single promise rather than a numbered sequence.
      decor: z.enum(['none', 'gradient_tiles', 'framed']),
      // The band's own link, on the heading's baseline rather than
      // under the grid, and the cell that answers "what if mine is not
      // one of these?".
      ctaText: z.string().max(100),
      ctaLink: zLink,
      prompt: z
        .object({
          title: z.string().min(1).max(100),
          text: z.string().max(300).optional(),
          ctaText: z.string().max(100).optional(),
          ctaLink: zLink.optional(),
        })
        .strip(),
    })
    .partial()
    .strip(),
  media_text: z
    .object({
      heading: z.string().max(200),
      body: z.string().max(5000),
      // A label above the heading, a footnote under the body, a
      // checklist, and comparison cards for the side of the band that
      // carries no image. `emphasis` is a SUBSTRING of `body` to set
      // in the emphasis weight — body renders as text, and an HTML
      // prop would be an injection surface for one bold phrase.
      eyebrow: z.string().max(100),
      note: z.string().max(200),
      emphasis: z.string().max(120),
      bullets: z
        .array(z.object({ text: z.string().min(1).max(300) }).strip())
        .max(6),
      specs: z
        .array(
          z
            .object({
              label: z.string().max(40).optional(),
              name: z.string().min(1).max(60),
              subtitle: z.string().max(120).optional(),
              rows: z
                .array(
                  z
                    .object({
                      label: z.string().min(1).max(40),
                      value: z.string().min(1).max(80),
                    })
                    .strip(),
                )
                .max(8)
                .optional(),
            })
            .strip(),
        )
        .max(4),
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
  story_timeline: z
    .object({
      heading: z.string().max(200),
      subheading: z.string().max(500),
      items: z
        .array(
          z
            .object({
              title: z.string().max(100),
              date: z.string().max(50).optional(),
              text: z.string().max(500).optional(),
              icon: z.string().max(100).regex(/^i-[a-z0-9:-]+$/).optional(),
            })
            .strip(),
        )
        .max(20),
      // Which page surface the band paints — the same enum, and the
      // same reason, as `cta_banner`.
      surface: z.enum(['default', 'muted']),
    })
    .partial()
    .strip(),
  faq: z
    .object({
      heading: z.string().max(200),
      items: z
        .array(
          z
            .object({
              question: z.string().max(200),
              answer: z.string().max(2000),
            })
            .strip(),
        )
        .max(30),
      multiple: z.boolean(),
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
