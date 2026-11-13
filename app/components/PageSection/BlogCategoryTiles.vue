<script lang="ts" setup>
/**
 * The blog's categories as tiles, the `tiles` layout of `blog_categories`
 * in every design: each category's icon (`deriveIconName`, else its
 * picture, the rail's rule), its whole name and how many posts it holds,
 * linking where the rail's buttons link. Two columns on a phone, four on a
 * desk; the heading, sub-line and call to action are the band's.
 *
 * Renders nothing when the blog has no categories yet, as the rail does.
 */
const props = defineProps<{
  eyebrow?: string
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()

const { t, n, locale } = useStoreI18n('components/PageSection/BlogCategoryTiles')
const localePath = useLocalePath()
const linkTo = useLinkTo()

const tiles = computed(() => props.categories.items.map(category => ({
  id: category.id,
  name: extractTranslated(category, 'name', locale.value) ?? '',
  icon: deriveIconName(category.mainImagePath) ?? undefined,
  imagePath: category.mainImagePath,
  posts: t('posts', { count: category.postCount }, category.postCount),
  to: localePath({ name: 'blog-category-id-slug', params: { id: category.id, slug: category.slug } }),
})))

/**
 * The base design (a store with its own templates, webside) draws its board's
 * tiles: the icon on an accent tint beside the name and the count at every
 * width (36px on a phone, 44px from `sm`), a chevron on a desk, and on a
 * phone no sub-line and no link (`phoneCta`). Groove Volt keeps its own.
 */
/**
 * The link's text with `{count}` read as how many posts the categories hold
 * between them («Όλα τα {count} άρθρα»), so the figure never goes stale.
 */
const ctaLabel = computed(() => {
  if (!props.ctaText?.includes('{count}')) return props.ctaText
  const total = props.categories.items.reduce((sum, category) => sum + category.postCount, 0)
  return props.ctaText.replaceAll('{count}', n(total))
})

const design = useStorefrontDesign()
const own = computed(() => design.value !== 'volt')
</script>

<template>
  <PageSectionBand
    v-if="tiles.length"
    :eyebrow="eyebrow"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaLabel"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
    phone-cta="none"
  >
    <ul
      v-if="own"
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
            sm:min-h-19 sm:gap-3.5 sm:px-4 sm:py-3.5
          "
        >
          <span
            class="
              grid size-9 shrink-0 place-items-center rounded-lg
              bg-(--ui-secondary-soft) text-accent
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
    <UPageGrid
      v-else
      as="ul"
      class="
        grid-cols-2 gap-3
        lg:grid-cols-4 lg:gap-4
      "
    >
      <!-- Each tile is a container: one narrower than 11rem (two to a
           row on a phone up to about 400px) puts the icon above the name,
           which then has the tile's whole width. Beside the icon, the name
           had 58px at 320px, and «Development» or «Συμβουλές» ran past the
           screen. A word wider than the tile still breaks rather than
           overflows. -->
      <UPageCard
        v-for="tile in tiles"
        :key="tile.id"
        as="li"
        variant="outline"
        :to="tile.to"
        :icon="tile.icon"
        :title="tile.name"
        :description="tile.posts"
        class="@container"
        :ui="{
          container: `
            p-3
            sm:p-4
          `,
          wrapper: `
            flex-col items-start gap-3
            sm:gap-3.5
            @min-[11rem]:flex-row @min-[11rem]:items-center
          `,
          leading: `
            mb-0 size-11 shrink-0 justify-center rounded-md bg-secondary/10
          `,
          leadingIcon: 'size-5.5 text-accent',
          body: 'min-w-0',
          title: `
            text-sm/snug font-bold wrap-break-word
            sm:text-base/snug
          `,
          description: 'text-[0.8125rem] text-muted',
        }"
      >
        <template
          v-if="!tile.icon"
          #leading
        >
          <!-- The rail's picture, as the rail requests it; the tile's
               name already says what it is. -->
          <ImgWithFallback
            class="aspect-square size-6"
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
        </template>
      </UPageCard>
    </UPageGrid>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  posts: '{count} άρθρο | {count} άρθρα'
en:
  posts: '{count} article | {count} articles'
</i18n>
