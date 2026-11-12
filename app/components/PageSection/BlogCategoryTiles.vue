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
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()

const { t, locale } = useStoreI18n('components/PageSection/BlogCategoryTiles')
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
</script>

<template>
  <PageSectionBand
    v-if="tiles.length"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
  >
    <UPageGrid
      as="ul"
      class="
        grid-cols-2 gap-3
        lg:grid-cols-4 lg:gap-4
      "
    >
      <UPageCard
        v-for="tile in tiles"
        :key="tile.id"
        as="li"
        variant="outline"
        :to="tile.to"
        :icon="tile.icon"
        :title="tile.name"
        :description="tile.posts"
        :ui="{
          container: `
            p-3
            sm:p-4
          `,
          wrapper: `
            flex-row items-center gap-3
            sm:gap-3.5
          `,
          leading: `
            mb-0 size-11 shrink-0 justify-center rounded-md bg-secondary/10
          `,
          leadingIcon: 'size-5.5 text-accent',
          body: 'min-w-0',
          title: `
            text-sm/snug font-bold
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
