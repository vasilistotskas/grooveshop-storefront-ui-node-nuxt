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
 * page modes, `auto` follows the page. A store without a catalogue gets
 * no search and no product; one without a cart, no buy button.
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
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  product?: ResolvedRef<ProductCard>
  showAddToCart?: boolean
  colorScheme?: SectionColorScheme
}>(), {
  showSearch: false,
  showAddToCart: true,
  colorScheme: 'auto',
})

const localePath = useLocalePath()
const leadsPage = useLeadsPage()
const { isMobileOrTablet } = useDevice()
const catalogueEnabled = useStoreFeature('catalogue')

/** The picture a hero shows on this device, with the size a media asset carries, so its box is reserved before it loads. */
const shown = computed(() => {
  const image = heroImage(props, isMobileOrTablet.value)
  return image?.width && image.height ? { ...image, width: image.width, height: image.height } : undefined
})

const headingText = computed(() => [props.heading, props.headingAccent].filter(Boolean).join(' '))

const alt = computed(() => heroImageAlt(props, shown.value, headingText.value))

/**
 * What the picture's link is called: the picture's description, else the
 * heading, decorative or not. A decorative picture keeps `alt=""` and names
 * its link with `aria-label` instead. With neither a description nor a
 * heading the link would have no name (WCAG 2.4.4, 4.1.2), so the picture is
 * then not a link.
 */
const linkName = computed(() => heroImageAlt({ ...props, imageDecorative: false }, shown.value, headingText.value))
const pictureLink = computed(() => (props.imageLink && linkName.value ? props.imageLink : undefined))

const spotlight = computed(() =>
  catalogueEnabled.value && props.product?.status === 'ok' ? props.product.value : undefined,
)

const search = computed(() => props.showSearch && catalogueEnabled.value)

const buttons = computed(() => [
  props.ctaText && props.ctaLink
    ? { label: props.ctaText, to: localePath(pathLocation(props.ctaLink)), variant: 'solid' as const }
    : null,
  props.secondaryCtaText && props.secondaryCtaLink
    ? { label: props.secondaryCtaText, to: localePath(pathLocation(props.secondaryCtaLink)), variant: 'outline' as const }
    : null,
].filter(button => button !== null))

const hasHeading = computed(() => !!(props.heading || props.headingAccent))
const hasCopy = computed(() => hasHeading.value || !!props.eyebrow || !!props.subheading)

/** The right-hand column exists only when it holds something. */
const twoColumns = computed(() => !!shown.value || !!spotlight.value)

/** A hero with nothing to show is not a band. */
const hasContent = computed(() => hasCopy.value || twoColumns.value || search.value || buttons.value.length > 0)

/**
 * Resolved here rather than named as a string in `:is`: a string that is
 * not a native tag renders as an unknown element (`PageSection/Band.vue`).
 */
const pictureFrame = computed(() => (pictureLink.value ? resolveComponent('NuxtLink') : 'div'))
</script>

<template>
  <section
    v-if="hasContent"
    :class="[
      `
        relative isolate w-full bg-muted bg-(image:--ds-lattice)
        bg-size-[1.5rem_1.5rem]
      `,
      colorSchemeClass(colorScheme),
    ]"
  >
    <UContainer
      :class="[
        `
          grid gap-6 py-12
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
            text-balance text-highlighted
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
        :to="pictureLink ? localePath(pathLocation(pictureLink)) : undefined"
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
        <SearchInput />
      </div>

      <div
        v-if="buttons.length"
        class="
          flex flex-wrap gap-3
          lg:col-start-1 lg:row-start-3 lg:mt-6 lg:self-start
        "
      >
        <UButton
          v-for="button in buttons"
          :key="button.variant"
          :to="button.to"
          :label="button.label"
          :variant="button.variant"
          color="secondary"
          size="xl"
        />
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
