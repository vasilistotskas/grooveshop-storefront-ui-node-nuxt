<script lang="ts" setup>
/**
 * The top of a page that sells and searches at once: a heading whose
 * second line is drawn in the accent, a sub-line, the store search, two
 * buttons, a picture (with its own phone version and link) and one
 * product to buy on the spot (`Product/Spotlight`).
 *
 * One list of parts in the order a phone reads them (heading, sub-line,
 * picture, search, buttons, product), placed into two columns on a desk
 * by CSS grid: the copy, search and buttons on the left, the picture over
 * the product on the right. A hero with neither picture nor product is a
 * single column of copy, never an empty one. `UPageHero` does not fit: it
 * wraps the heading, body and links in one element and puts its media in
 * a second, so the picture could not sit between the sub-line and the
 * search on a phone without drawing it twice.
 *
 * It renders the page's h1 (`HEADING_SECTION_TYPES`), both lines in one.
 * The picture is the hero's own, not a backdrop: an inline banner at its
 * own proportions, by the rule every hero follows for the phone version,
 * the description and the loading priority (`heroImage`, `heroImageAlt`,
 * `useLeadsPage`).
 *
 * `colorScheme` is the band's: `dark` and `light` hold it in both
 * page modes; without one it follows the page. A store without a catalogue gets
 * no search and no product; one without a cart, no buy button.
 *
 * `look: 'bold'` draws the same parts as `PageSection/HeroShowcaseBold`;
 * left out, this one, as it always was. Both read the settings through
 * `useHeroShowcase`.
 */
const props = withDefaults(defineProps<{
  eyebrow?: string
  heading?: string
  /** The heading's second line, in the accent. */
  headingAccent?: string
  subheading?: string
  image?: ResolvedImage
  mobileImage?: ResolvedImage
  /** The picture is decoration: an explicit choice, so an empty description alone never means it. */
  imageDecorative?: boolean
  imageLink?: string
  showSearch?: boolean
  /** The search field's own question, in place of the store search's wording. */
  searchPlaceholder?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  product?: ResolvedRef<ProductCard>
  showAddToCart?: boolean
  colorScheme?: SectionColorScheme
  /** `bold`: the heavier, centred look (`PageSection/HeroShowcaseBold`). */
  look?: 'bold'
}>(), {
  showSearch: false,
  showAddToCart: true,
})

const linkTo = useLinkTo()
const leadsPage = useLeadsPage()

const { shown, alt, linkName, pictureLink, spotlight, search, buttons, hasHeading, hasCopy, twoColumns, hasContent }
  = useHeroShowcase(props)

/**
 * Resolved here rather than named as a string in `:is`: a string that is
 * not a native tag renders as an unknown element (`PageSection/Band.vue`).
 * In the component, where Nuxt's component transform resolves it.
 */
const pictureFrame = computed(() => (pictureLink.value ? resolveComponent('NuxtLink') : 'div'))
/** The store's own search field: the header's search, in every design. */
const searchField = useSearchFieldPart()
</script>

<template>
  <PageSectionHeroShowcaseBold
    v-if="look === 'bold'"
    v-bind="props"
  />
  <section
    v-else-if="hasContent"
    :class="[
      `
        relative isolate w-full bg-muted bg-(image:--ds-lattice)
        bg-size-[1.5rem_1.5rem]
      `,
      colorSchemeClass(colorScheme),
    ]"
  >
    <!-- One column of the container's width on a phone (`minmax(0, 1fr)`,
         not the implicit `auto` track, which grew to the min-content of
         the widest part: the two buttons' labels, the display face's
         heading, and pushed the page sideways); two from `lg`. -->
    <UContainer
      :class="[
        `
          grid grid-cols-[minmax(0,1fr)] gap-6 py-12
          lg:gap-x-12 lg:gap-y-0 lg:py-22
        `,
        twoColumns && `
          lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]
          lg:grid-rows-[auto_auto_auto_1fr]
        `,
      ]"
    >
      <div
        v-if="hasCopy"
        class="
          flex flex-col gap-4
          lg:col-start-1 lg:row-start-1 lg:self-end
        "
      >
        <!-- Sentence case, as the operator typed it: the eyebrow every
             hero and band uses. -->
        <p
          v-if="eyebrow"
          class="text-sm font-medium text-accent"
        >
          {{ eyebrow }}
        </p>

        <h1
          v-if="hasHeading"
          class="
            max-w-3xl font-display text-4xl font-semibold tracking-tight
            text-balance wrap-break-word text-highlighted
            md:text-5xl
            lg:text-6xl
          "
        >
          {{ heading }}
          <span
            v-if="headingAccent"
            class="block text-accent"
          >{{ headingAccent }}</span>
        </h1>

        <p
          v-if="subheading"
          class="
            max-w-2xl text-base text-pretty text-muted
            md:text-lg
          "
        >
          {{ subheading }}
        </p>
      </div>

      <component
        :is="pictureFrame"
        v-if="shown"
        :to="pictureLink ? linkTo(pictureLink) : undefined"
        :aria-label="pictureLink && !alt ? linkName : undefined"
        class="
          block overflow-hidden rounded-lg border border-default
          lg:col-start-2 lg:row-start-1 lg:self-end
        "
      >
        <ImgWithFallback
          :src="shown.path"
          :alt="alt"
          :width="shown.width"
          :height="shown.height"
          sizes="xs:100vw lg:50vw xl:720px"
          densities="x1 x2"
          class="block h-auto w-full"
          :loading="leadsPage ? 'eager' : 'lazy'"
          :fetchpriority="leadsPage ? 'high' : undefined"
          :preload="leadsPage"
        />
      </component>

      <!-- Measured like the search band's field. -->
      <div
        v-if="search"
        class="
          w-full max-w-2xl
          lg:col-start-1 lg:row-start-2 lg:mt-7
        "
      >
        <component
          :is="searchField.component"
          v-bind="searchField.props({ placeholder: searchPlaceholder })"
        />
      </div>

      <div
        v-if="buttons.length"
        class="
          flex gap-2
          sm:flex-wrap sm:gap-3
          lg:col-start-1 lg:row-start-3 lg:mt-6 lg:self-start
        "
      >
        <!-- On a phone the two share the row in equal columns, 48px tall
             (a target of at least 44px, WCAG 2.5.5), with the label of
             Nuxt UI's `md` size (14px) and the padding of its `xs` (8px a
             side) so a label of about 16 Greek letters keeps one line:
             128px of label at 360px, 143px at 390px. From `sm` up they are
             `xl`, the size their label makes them. A longer label wraps
             inside the button (`min-w-0` lets the column shrink; the label
             is our own span, since Nuxt UI's truncates), so no word is cut
             and the row never outgrows the screen. -->
        <UButton
          v-for="button in buttons"
          :key="button.variant"
          :to="button.to"
          :variant="button.variant"
          color="secondary"
          size="xl"
          class="
            min-h-12 min-w-0 flex-1 justify-center
            max-sm:px-2 max-sm:text-sm
            sm:min-h-0 sm:flex-none
          "
        >
          <span class="text-center text-balance wrap-break-word">{{ button.label }}</span>
        </UButton>
      </div>

      <ProductSpotlight
        v-if="spotlight"
        :product="spotlight"
        :show-add-to-cart="showAddToCart"
        :class="shown
          ? `lg:col-start-2 lg:row-span-3 lg:row-start-2 lg:mt-5 lg:self-start`
          : `lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center`"
      />
    </UContainer>
  </section>
</template>
