<script lang="ts" setup>
/**
 * `hero_showcase` in its bold look (`look: 'bold'`), every design: the same
 * parts as `PageSection/HeroShowcase` (`useHeroShowcase`), drawn heavier:
 * a 36px heading on a phone and 56px on a desk at 800, the copy centred
 * against the picture and the product on a desk (the grid's two `1fr` rows
 * above and below the copy take up the difference), a white search field with
 * its own button, 48px buttons with the main one in the accent's deep shade
 * and an arrow, the accent's graph paper behind, and the product in its bold
 * card (`Product/SpotlightBold`).
 *
 * One list of parts in the order a phone reads them (heading, sub-line,
 * picture, search, buttons, product), placed into two columns on a desk by
 * CSS grid. It renders the page's h1 (`HEADING_SECTION_TYPES`).
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
  /** Always `bold` here: the setting that chose this look. */
  look?: 'bold'
}>(), {
  showSearch: false,
  showAddToCart: true,
})

const linkTo = useLinkTo()
const leadsPage = useLeadsPage()

const { shown, alt, linkName, pictureLink, spotlight, search, buttons, hasCopy, hasHeading, twoColumns, hasContent }
  = useHeroShowcase(props)

/**
 * Resolved here rather than named as a string in `:is`: a string that is
 * not a native tag renders as an unknown element (`PageSection/Band.vue`).
 * In the component, where Nuxt's component transform resolves it.
 */
const pictureFrame = computed(() => (pictureLink.value ? resolveComponent('NuxtLink') : 'div'))
</script>

<template>
  <section
    v-if="hasContent"
    :class="[
      `
        relative isolate w-full bg-default bg-(image:--ds-lattice-accent)
        bg-size-[1.5rem_1.5rem]
      `,
      colorSchemeClass(colorScheme),
    ]"
  >
    <!-- One column of the container's width on a phone (`minmax(0, 1fr)`,
         not the implicit `auto` track, which grows to the min-content of
         the widest part and pushed the page sideways); two from `lg`. -->
    <UContainer
      class="
        grid grid-cols-[minmax(0,1fr)] gap-4.5 pt-7 pb-6
        lg:gap-x-12 lg:gap-y-0 lg:pt-18 lg:pb-20
      "
      :class="twoColumns && `
        lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]
        lg:grid-rows-[1fr_auto_auto_auto_1fr]
      `"
    >
      <div
        v-if="hasCopy"
        class="
          flex flex-col gap-4.5
          lg:col-start-1 lg:row-start-2 lg:gap-6
        "
      >
        <p
          v-if="eyebrow"
          class="text-sm font-medium text-accent"
        >
          {{ eyebrow }}
        </p>

        <h1
          v-if="hasHeading"
          class="
            max-w-3xl font-display text-4xl/[1.08] font-extrabold
            tracking-[-0.02em] text-balance wrap-break-word text-highlighted
            md:text-5xl/[1.04]
            lg:text-[3.5rem]/[1.04]
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
            max-w-130 text-base/normal text-pretty text-toned
            md:text-lg/[1.55]
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
          lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end lg:rounded-xl
          lg:shadow-(--ds-picture-shadow)
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

      <!-- White on a dark band as on a light one (`light`). -->
      <div
        v-if="search"
        class="
          w-full max-w-140
          lg:col-start-1 lg:row-start-3 lg:mt-6
        "
        :class="colorSchemeClass('light')"
      >
        <SearchInput
          :placeholder="searchPlaceholder"
          size="lg"
        />
      </div>

      <!-- Two equal 48px columns on a phone (a target of at least 44px,
           WCAG 2.5.5); a label wraps inside its button rather than
           widening the row. From `sm` up, the size their labels make them. -->
      <div
        v-if="buttons.length"
        class="
          grid grid-cols-2 gap-2
          sm:flex sm:flex-wrap sm:gap-3
          lg:col-start-1 lg:row-start-4 lg:mt-6 lg:self-start
        "
      >
        <UButton
          v-for="button in buttons"
          :key="button.variant"
          :to="button.to"
          :variant="button.variant"
          color="secondary"
          size="xl"
          :trailing-icon="button.variant === 'solid' ? 'i-lucide-arrow-right' : undefined"
          class="
            min-h-12 min-w-0 justify-center px-2 text-[0.9375rem]
            sm:flex-none sm:px-5
          "
          :class="button.variant === 'solid' ? `
            bg-(--ui-secondary-deep) font-bold text-(--ui-on-secondary-deep)
            hover:bg-(--ui-secondary-deep)/90
          ` : 'font-semibold text-accent ring-accented'"
          :ui="{ trailingIcon: 'max-sm:hidden' }"
        >
          <span class="text-center text-balance wrap-break-word">{{ button.label }}</span>
        </UButton>
      </div>

      <ProductSpotlight
        v-if="spotlight"
        :product="spotlight"
        :show-add-to-cart="showAddToCart"
        look="bold"
        :class="shown
          ? `
            mt-1.5
            lg:col-start-2 lg:row-span-3 lg:row-start-3 lg:mt-4 lg:self-start
          `
          : 'lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-center'"
      />
    </UContainer>
  </section>
</template>
