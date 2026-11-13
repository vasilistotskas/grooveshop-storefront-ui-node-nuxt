<script lang="ts" setup>
/**
 * The blog's categories as tiles in their bold look (`blog_categories` with
 * `layout: 'tiles'` and `look: 'bold'`, every design): the same tiles as
 * `PageSection/BlogCategoryTiles` (`useBlogCategoryTiles`), each one link with
 * the icon on an accent tint BESIDE the name and the count at every width
 * (36px on a phone, 44px from `sm`), a chevron on a desk; as many 280px
 * columns as fit on a desk, two on a phone. The band is the bold one
 * (`PageSection/BandBold`), and on a phone it shows neither the sub-line nor
 * the link.
 */
const props = defineProps<{
  eyebrow?: string
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
  /** Always `bold` here: the setting that chose this look. */
  look?: 'bold'
  /**
   * The section's own texts (its `useStoreI18n` namespace), so a store's
   * edited wording follows when it switches look.
   */
  texts: (key: string, named?: Record<string, unknown>, plural?: number) => string
}>()

const linkTo = useLinkTo()

const { tiles, ctaLabel } = useBlogCategoryTiles(props, count => props.texts('posts', { count }, count))
</script>

<template>
  <PageSectionBandBold
    v-if="tiles.length"
    :eyebrow="eyebrow"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaLabel"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
    phone-cta="none"
  >
    <ul
      class="
        grid grid-cols-2 gap-2
        sm:grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] sm:gap-4
      "
    >
      <li
        v-for="tile in tiles"
        :key="tile.id"
      >
        <NuxtLink
          :to="tile.to"
          class="
            flex h-full min-h-15 items-center gap-2.5 rounded-lg border
            border-default bg-default px-2.5 py-2 text-highlighted
            transition-colors
            hover:border-accented
            focus-visible:outline-2 focus-visible:outline-secondary
            motion-reduce:transition-none
            sm:min-h-19 sm:gap-3.5 sm:px-4 sm:py-3.5
          "
        >
          <span
            class="
              grid size-9 shrink-0 place-items-center rounded-lg
              bg-(--ds-accent-tint) text-accent
              sm:size-11
            "
          >
            <UIcon
              v-if="tile.icon"
              :name="tile.icon"
              class="
                size-4.5
                sm:size-5.5
              "
            />
            <ImgWithFallback
              v-else
              class="aspect-square size-5"
              alt=""
              fit="fill"
              :format="'svg'"
              :height="25"
              :src="tile.imagePath"
              :width="25"
              quality="80"
              loading="lazy"
              :modifiers="{
                position: 'entropy',
              }"
            />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span
              class="
                text-sm font-bold wrap-break-word
                sm:text-base
              "
            >{{ tile.name }}</span>
            <span
              class="
                text-xs text-muted
                sm:text-[0.8125rem]
              "
            >{{ tile.posts }}</span>
          </span>
          <UIcon
            name="i-lucide-chevron-right"
            class="
              size-4.5 shrink-0 text-muted
              max-sm:hidden
            "
          />
        </NuxtLink>
      </li>
    </ul>
  </PageSectionBandBold>
</template>
