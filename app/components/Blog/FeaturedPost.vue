<script lang="ts" setup>
/**
 * The blog's featured post, as the board opens the index with it: the
 * picture large on one side, on the other a "Featured" tag, its
 * category, the title in the display face, the subtitle as the lead,
 * and when it was published and how long it takes to read.
 *
 * One target: the title's link stretches over the whole block. The post
 * carries its author as an id only, so no author is named here.
 */
const props = withDefaults(defineProps<{
  post: BlogPost
  /** The post's category, named — the post carries only its id. */
  categoryName?: string
  imgLoading?: 'lazy' | 'eager'
  imgFetchPriority?: 'high' | 'low' | 'auto'
  preload?: boolean
}>(), {
  imgLoading: 'eager',
  imgFetchPriority: 'high',
  preload: true,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const title = computed(() => extractTranslated(props.post, 'title', locale.value) ?? '')
const subtitle = computed(() => extractTranslated(props.post, 'subtitle', locale.value) ?? '')
const url = computed(() => localePath({ path: blogPostUrl(props.post.id, props.post.slug) }))
</script>

<template>
  <article
    class="
      group relative grid items-center gap-6
      lg:grid-cols-[1.25fr_1fr] lg:gap-12
    "
  >
    <div class="aspect-4/3 overflow-hidden rounded-[1.5rem] bg-elevated">
      <ImgWithFallback
        :src="post.mainImagePath"
        :alt="title"
        :width="960"
        :height="720"
        fit="cover"
        :modifiers="{ position: 'attention' }"
        quality="80"
        densities="x1"
        sizes="xs:100vw lg:60vw"
        :loading="imgLoading"
        :fetchpriority="imgFetchPriority"
        :preload="preload"
        class="
          size-full object-cover transition-transform duration-300
          group-hover:scale-105
        "
      />
    </div>

    <div class="flex flex-col items-start gap-4">
      <p class="flex flex-wrap items-center gap-2">
        <UBadge
          :label="t('featured')"
          size="sm"
          class="bg-volt text-on-volt"
        />
        <UBadge
          v-if="categoryName"
          :label="categoryName"
          color="neutral"
          variant="soft"
          size="sm"
        />
      </p>

      <h2
        class="
          font-display text-[1.75rem]/[1.1] font-bold tracking-[-0.02em]
          text-balance text-highlighted
          lg:text-[2.5rem]/[1.1]
        "
      >
        <NuxtLink
          :to="url"
          class="
            after:absolute after:inset-0 after:rounded-[1.5rem]
            focus-visible:outline-none
            focus-visible:after:ring-2 focus-visible:after:ring-secondary
          "
        >
          {{ title }}
        </NuxtLink>
      </h2>

      <p
        v-if="subtitle"
        class="text-base text-pretty text-toned"
      >
        {{ subtitle }}
      </p>

      <p class="flex flex-wrap items-center gap-x-2 text-sm text-toned">
        <NuxtTime
          v-if="post.publishedAt"
          :datetime="post.publishedAt"
          :locale="locale"
          day="numeric"
          month="short"
          year="numeric"
        />
        <template v-if="post.readingTime">
          <span aria-hidden="true">·</span>
          <span>{{ t('reading_time', { minutes: post.readingTime }, post.readingTime) }}</span>
        </template>
      </p>
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  featured: Προτεινόμενο
  reading_time: '{minutes} λεπτό ανάγνωσης | {minutes} λεπτά ανάγνωσης'
en:
  featured: Featured
  reading_time: '{minutes} min read'
</i18n>
