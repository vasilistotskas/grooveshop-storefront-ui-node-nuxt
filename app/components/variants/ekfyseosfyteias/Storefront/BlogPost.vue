<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * One activity, as an article: the title large beside the photograph,
 * the post's subtitle as its lead, the body in a 700px column under a
 * dashed rule, and a sage band at the foot with the way back and a
 * related activity.
 *
 * The data and the head are the platform post's, unchanged
 * (`useBlogPostPage`); only the drawing differs. There are no comments
 * and no likes. The related activity is the first of the post's related
 * posts, which the platform serves after the page has rendered.
 */
const { t, locale } = useStoreI18n('components/variants/ekfyseosfyteias/Storefront/BlogPost')
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const {
  blogPost,
  refresh,
  blogPostCategoryName,
  blogPostTitle,
  blogPostSubtitle,
  blogPostBody,
  relatedPosts,
} = await useBlogPostPage({ articleMaxWidth: ARTICLE_COLUMN_MAX_WIDTH })

onReactivated(async () => {
  await refresh()
})

const breadcrumb = computed(() => [
  { label: t('breadcrumb.home'), to: 'index' as const },
  { label: t('breadcrumb.activities'), to: 'blog' as const },
  { label: blogPostTitle.value },
])

const related = computed(() => {
  const post = relatedPosts.value?.[0]
  return post
    ? {
        url: localePath({ path: blogPostUrl(post.id, post.slug) }),
        title: extractTranslated(post, 'title', locale.value) ?? '',
        image: post.mainImagePath,
      }
    : undefined
})

const CARD_FOCUS = `
  focus-visible:outline-3 focus-visible:outline-offset-3
  focus-visible:outline-(color:--fy-focus)
`
</script>

<template>
  <article
    v-if="blogPost"
    class="bg-(--fy-ground) text-(--fy-text)"
  >
    <header
      class="
        mx-auto grid w-full max-w-[1280px]
        grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center
        gap-x-18 gap-y-10 px-6 pt-[clamp(40px,5vw,72px)]
        pb-[clamp(40px,5vw,64px)]
      "
    >
      <div class="flex min-w-0 flex-col items-start gap-[22px]">
        <VariantsEkfyseosfyteiasBlogBreadcrumb :items="breadcrumb" />
        <p class="flex flex-wrap items-center gap-2.5">
          <span
            v-if="blogPostCategoryName"
            class="
              rounded-full bg-(--fy-raised) px-3 py-[5px] text-[13px]
              font-semibold text-(--fy-eyebrow)
            "
          >{{ blogPostCategoryName }}</span>
          <NuxtTime
            v-if="blogPost.publishedAt"
            :datetime="blogPost.publishedAt"
            :locale="locale"
            time-zone="UTC"
            day="numeric"
            month="long"
            year="numeric"
            class="text-sm font-semibold text-(--fy-accent-text)"
          />
        </p>
        <!-- min-w-0 + wrap-anywhere: a long Greek word may break rather than run under the photograph. -->
        <h1
          class="
            min-w-0 font-display text-[length:clamp(40px,4.4vw,64px)]
            leading-[0.98] font-extrabold tracking-[-0.025em] text-balance
            wrap-anywhere hyphens-auto
          "
        >
          {{ blogPostTitle }}
        </h1>
        <p
          v-if="blogPostSubtitle"
          class="
            max-w-[30em] text-[length:clamp(19px,1.6vw,22px)] leading-[1.6]
            text-pretty
          "
        >
          {{ blogPostSubtitle }}
        </p>
      </div>

      <ImgWithFallback
        v-if="blogPost.mainImagePath"
        :src="blogPost.mainImagePath"
        :alt="blogPostTitle"
        :width="800"
        :height="1000"
        sizes="xs:100vw sm:100vw md:100vw lg:640px"
        fit="cover"
        :modifiers="{ position: 'attention' }"
        quality="80"
        densities="x1 x2"
        loading="eager"
        fetchpriority="high"
        preload
        class="
          block aspect-4/5 max-h-[640px] w-full rounded-[28px] object-cover
        "
      />
    </header>

    <div class="mx-auto w-full max-w-[1280px] px-6">
      <div
        class="
          mx-auto max-w-[700px] border-t-[1.5px] border-dashed
          border-(color:--fy-rule) py-[clamp(32px,4vw,48px)]
        "
      >
        <!-- Static HTML: hydrated never. -->
        <LazyVariantsEkfyseosfyteiasBlogProse
          hydrate-never
          :html="blogPostBody"
        />
      </div>
    </div>

    <nav
      :aria-label="t('more_label')"
      class="bg-(--fy-raised)"
    >
      <div
        class="
          mx-auto grid w-full max-w-[1280px]
          grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-stretch
          gap-5 px-6 py-[clamp(48px,6vw,80px)]
        "
      >
        <NuxtLinkLocale
          to="blog"
          class="
            flex flex-col justify-center gap-2 rounded-3xl border-2
            border-dashed border-(color:--fy-text) p-7 text-(--fy-text)
            hover:bg-(--fy-surface)
          "
          :class="CARD_FOCUS"
        >
          <span class="text-[13px] font-bold tracking-[0.14em] text-(--fy-eyebrow) uppercase">{{ t('back') }}</span>
          <span class="font-display text-[28px] leading-[1.1] font-bold">{{ t('all_activities') }}</span>
        </NuxtLinkLocale>

        <NuxtLink
          v-if="related"
          :to="related.url"
          class="
            flex items-center gap-5 rounded-3xl bg-(--fy-surface) p-4
            text-(--fy-text)
          "
          :class="CARD_FOCUS"
        >
          <ImgWithFallback
            v-if="related.image"
            :src="related.image"
            alt=""
            :width="240"
            :height="240"
            sizes="120px"
            fit="cover"
            quality="80"
            densities="x1 x2"
            loading="lazy"
            class="block size-[120px] shrink-0 rounded-2xl object-cover"
          />
          <span class="flex min-w-0 flex-col gap-1.5">
            <span class="text-[13px] font-bold tracking-[0.14em] text-(--fy-eyebrow) uppercase">{{ t('related') }}</span>
            <span class="font-display text-[22px] leading-[1.15] font-bold">{{ related.title }}</span>
          </span>
        </NuxtLink>
      </div>
    </nav>
  </article>
</template>

<i18n lang="yaml">
el:
  breadcrumb:
    home: Αρχική
    activities: Δράσεις
  more_label: Περισσότερες δράσεις
  back: Πίσω
  all_activities: Όλες οι δράσεις
  related: Σχετική δράση
en:
  breadcrumb:
    home: Home
    activities: Activities
  more_label: More activities
  back: Back
  all_activities: All activities
  related: Related activity
</i18n>
