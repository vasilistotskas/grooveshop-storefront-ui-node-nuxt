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
  /** The search field's own question. */
  searchPlaceholder?: string
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
})

const linkTo = useLinkTo()
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
    ? { label: props.ctaText, to: linkTo(props.ctaLink), variant: 'solid' as const }
    : null,
  props.secondaryCtaText && props.secondaryCtaLink
    ? { label: props.secondaryCtaText, to: linkTo(props.secondaryCtaLink), variant: 'outline' as const }
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

/**
 * Each part's classes in the design the store is drawn in. Groove Volt keeps
 * its own; the base design (a store with its own templates, webside) draws
 * the board it was designed on: a heavier, tighter heading, the copy centred
 * against the picture and the product on a desk (the grid's two `1fr` rows
 * above and below the copy take up the difference), a white search field
 * with its button, and 48px buttons with the main one in the accent's deep
 * shade. The grid places every part, so the order a phone reads them in is
 * the markup's in both designs.
 */
const VOLT_LOOK = {
  section: 'bg-muted',
  grid: `
    gap-6 py-12
    lg:gap-x-12 lg:gap-y-0 lg:py-22
  `,
  twoColumns: `
    lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]
    lg:grid-rows-[auto_auto_auto_1fr]
  `,
  copy: `
    flex flex-col gap-4
    lg:col-start-1 lg:row-start-1 lg:self-end
  `,
  heading: `
    max-w-3xl font-display text-4xl font-semibold tracking-tight text-balance
    wrap-break-word text-highlighted
    md:text-5xl
    lg:text-6xl
  `,
  subheading: `
    max-w-2xl text-base text-pretty text-muted
    md:text-lg
  `,
  picture: `
    block overflow-hidden rounded-lg border border-default
    lg:col-start-2 lg:row-start-1 lg:self-end
  `,
  search: `
    w-full max-w-2xl
    lg:col-start-1 lg:row-start-2 lg:mt-7
  `,
  searchScheme: '',
  searchSize: 'md' as 'md' | 'lg',
  buttons: `
    flex gap-2
    sm:flex-wrap sm:gap-3
    lg:col-start-1 lg:row-start-3 lg:mt-6 lg:self-start
  `,
  button: `
    min-h-12 min-w-0 flex-1 justify-center
    max-sm:px-2 max-sm:text-sm
    sm:min-h-0 sm:flex-none
  `,
  mainButton: '',
  secondButton: '',
  arrow: false,
  spotlightWithPicture: 'lg:col-start-2 lg:row-span-3 lg:row-start-2 lg:mt-5 lg:self-start',
  spotlightAlone: 'lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center',
}

const OWN_LOOK: typeof VOLT_LOOK = {
  section: 'bg-default',
  grid: `
    gap-4.5 pt-7 pb-6
    lg:gap-x-12 lg:gap-y-0 lg:pt-18 lg:pb-20
  `,
  twoColumns: `
    lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]
    lg:grid-rows-[1fr_auto_auto_auto_1fr]
  `,
  copy: `
    flex flex-col gap-4.5
    lg:col-start-1 lg:row-start-2 lg:gap-6
  `,
  heading: `
    max-w-3xl font-display text-4xl/[1.08] font-extrabold tracking-[-0.02em]
    text-balance wrap-break-word text-highlighted
    md:text-5xl/[1.04]
    lg:text-[3.5rem]/[1.04]
  `,
  subheading: `
    max-w-[32.5rem] text-base/normal text-pretty text-toned
    md:text-lg/[1.55]
  `,
  picture: `
    block overflow-hidden rounded-lg border border-default
    lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end lg:rounded-xl
    lg:shadow-[0_24px_48px_rgb(0_0_0/0.35)]
  `,
  search: `
    w-full max-w-[35rem]
    lg:col-start-1 lg:row-start-3 lg:mt-6
  `,
  // The field is white on a dark band, as on a light one.
  searchScheme: 'light',
  searchSize: 'lg',
  buttons: `
    grid grid-cols-2 gap-2
    sm:flex sm:flex-wrap sm:gap-3
    lg:col-start-1 lg:row-start-4 lg:mt-6 lg:self-start
  `,
  button: `
    min-h-12 min-w-0 justify-center px-2 text-[0.9375rem]
    sm:flex-none sm:px-5
  `,
  mainButton: `
    bg-(--ui-secondary-hover) font-bold
    hover:bg-(--ui-secondary-hover)/90
  `,
  secondButton: 'font-semibold text-accent ring-accented',
  arrow: true,
  spotlightWithPicture: `
    mt-1.5
    lg:col-start-2 lg:row-span-3 lg:row-start-3 lg:mt-4 lg:self-start
  `,
  spotlightAlone: 'lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-center',
}

const design = useStorefrontDesign()
const look = computed(() => (design.value === 'volt' ? VOLT_LOOK : OWN_LOOK))
</script>

<template>
  <section
    v-if="hasContent"
    :class="[
      `relative isolate w-full bg-(image:--ds-lattice) bg-size-[1.5rem_1.5rem]`,
      look.section,
      colorSchemeClass(colorScheme),
    ]"
  >
    <!-- One column of the container's width on a phone (`minmax(0, 1fr)`,
         not the implicit `auto` track, which grew to the min-content of
         the widest part: the two buttons' labels, the display face's
         heading, and pushed the page sideways); two from `lg`. -->
    <UContainer
      :class="[
        'grid grid-cols-[minmax(0,1fr)]',
        look.grid,
        twoColumns && look.twoColumns,
      ]"
    >
      <div
        v-if="hasCopy"
        :class="look.copy"
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
          :class="look.heading"
        >
          {{ heading }}
          <span
            v-if="headingAccent"
            class="block text-accent"
          >{{ headingAccent }}</span>
        </h1>

        <p
          v-if="subheading"
          :class="look.subheading"
        >
          {{ subheading }}
        </p>
      </div>

      <component
        :is="pictureFrame"
        v-if="shown"
        :to="pictureLink ? linkTo(pictureLink) : undefined"
        :aria-label="pictureLink && !alt ? linkName : undefined"
        :class="look.picture"
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
        :class="[look.search, look.searchScheme]"
      >
        <SearchInput
          :placeholder="searchPlaceholder"
          :size="look.searchSize"
        />
      </div>

      <div
        v-if="buttons.length"
        :class="look.buttons"
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
          :trailing-icon="look.arrow && button.variant === 'solid' ? 'i-lucide-arrow-right' : undefined"
          :class="[
            look.button,
            button.variant === 'solid' ? look.mainButton : look.secondButton,
          ]"
          :ui="{ trailingIcon: 'max-sm:hidden' }"
        >
          <span class="text-center text-balance wrap-break-word">{{ button.label }}</span>
        </UButton>
      </div>

      <ProductSpotlight
        v-if="spotlight"
        :product="spotlight"
        :show-add-to-cart="showAddToCart"
        :class="shown ? look.spotlightWithPicture : look.spotlightAlone"
      />
    </UContainer>
  </section>
</template>
