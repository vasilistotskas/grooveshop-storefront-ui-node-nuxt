<script lang="ts" setup>
/**
 * The blog's categories as tiles, the `tiles` layout of `blog_categories`
 * in every design: each category's icon (`deriveIconName`, else its
 * picture, the rail's rule), its whole name and how many posts it holds,
 * linking where the rail's buttons link. Two columns on a phone, four on a
 * desk; the heading, sub-line and call to action are the band's.
 *
 * Renders nothing when the blog has no categories yet, as the rail does.
 *
 * `look: 'bold'` is `PageSection/BlogCategoryTilesBold`, the same tiles
 * (`useBlogCategoryTiles`) drawn the bold way.
 */
const props = defineProps<{
  eyebrow?: string
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
  /** `bold`: the bold look (`PageSection/BlogCategoryTilesBold`). */
  look?: 'bold'
}>()

const { t } = useStoreI18n('components/PageSection/BlogCategoryTiles')
const linkTo = useLinkTo()

const { tiles, ctaLabel } = useBlogCategoryTiles(props, count => t('posts', { count }, count))
/** This component's texts, for its bold look (`PageSection/BlogCategoryTilesBold`). */
const texts = (key: string, named: Record<string, unknown> = {}, plural?: number) =>
  plural === undefined ? t(key, named) : t(key, named, plural)
</script>

<template>
  <PageSectionBlogCategoryTilesBold
    v-if="look === 'bold'"
    v-bind="props"
    :texts="texts"
  />
  <PageSectionBand
    v-else-if="tiles.length"
    :eyebrow="eyebrow"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaLabel"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
  >
    <UPageGrid
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
