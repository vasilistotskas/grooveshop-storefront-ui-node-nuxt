<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router'

/**
 * A band of posts drawn as one FEATURE card (`blog_posts_grid` with
 * `layout: 'feature'`): the topic's icon, eyebrow, heading, sub-line and its
 * button on one side, a few of its posts on the other. On a phone the copy,
 * then each post as a compact row (the thumbnail beside its reading time and
 * title), then the button across the card, last, where the thumb ends.
 *
 * The card, not the band, takes the section's colour scheme
 * (`colorSchemeClass`), so a dark card sits on the page's own ground, its
 * graph-paper lattice behind it. Every colour is a token, so the card is the
 * store's in either scheme and in every design.
 *
 * Each post is one link: its title's, stretched over the card.
 */
const props = defineProps<{
  eyebrow?: string
  heading: string
  subheading?: string
  /** The icon on the copy's tile, `i-<set>:<name>`; none, no tile. */
  icon?: string
  ctaText: string
  ctaLink: RouteLocationRaw
  colorScheme?: SectionColorScheme
  posts: readonly BlogPost[]
}>()

const { t, locale } = useStoreI18n('components/PageSection/BlogPostsFeature')
const localePath = useLocalePath()
const { blogPostUrl } = useUrls()

const items = computed(() => props.posts.map(post => ({
  id: post.id,
  title: extractTranslated(post, 'title', locale.value) ?? '',
  image: post.mainImagePath,
  minutes: post.readingTime,
  to: localePath({ path: blogPostUrl(post.id, post.slug) }),
})))
</script>

<template>
  <section
    class="
      w-full pt-10 pb-2
      lg:pt-22 lg:pb-24
    "
  >
    <UContainer>
      <div
        :class="colorSchemeClass(colorScheme)"
        class="
          grid grid-cols-1 gap-3.5 rounded-xl bg-default
          bg-(image:--ds-lattice-accent) bg-size-[1.5rem_1.5rem] px-4.5 py-6
          lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:gap-y-4 lg:p-12
        "
      >
        <div
          class="
            flex flex-col gap-3.5
            lg:col-start-1 lg:row-start-1 lg:gap-4 lg:self-end
          "
        >
          <span
            v-if="icon"
            class="
              grid size-13 place-items-center rounded-[0.625rem]
              bg-(--ds-accent-tint) text-accent
              max-lg:hidden
            "
          >
            <UIcon
              :name="icon"
              class="size-6.5"
            />
          </span>
          <p
            v-if="eyebrow"
            class="
              text-xs font-bold tracking-[0.06em] text-accent uppercase
              lg:text-[0.8125rem]
            "
          >
            {{ eyebrow }}
          </p>
          <h2
            class="
              font-display text-2xl/tight font-extrabold text-balance
              wrap-break-word text-highlighted
              lg:text-[2rem]/[1.2]
            "
          >
            {{ heading }}
          </h2>
          <p
            v-if="subheading"
            class="
              text-[0.9375rem]/normal text-pretty text-toned
              lg:text-base/[1.55]
            "
          >
            {{ subheading }}
          </p>
        </div>

        <ul
          class="
            flex flex-col gap-3.5
            lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid
            lg:grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] lg:gap-4
          "
        >
          <li
            v-for="post in items"
            :key="post.id"
            class="
              group relative flex items-center gap-3 overflow-hidden
              rounded-[0.625rem] border border-default bg-muted p-2.5
              lg:flex-col lg:items-stretch lg:gap-0 lg:p-0
            "
          >
            <div
              class="
                h-14.5 w-22 shrink-0 overflow-hidden rounded-md bg-elevated
                lg:aspect-16/10 lg:h-auto lg:w-full lg:rounded-none
              "
            >
              <ImgWithFallback
                :src="post.image"
                alt=""
                :width="480"
                :height="300"
                fit="cover"
                :modifiers="{ position: 'attention' }"
                densities="x1 x2"
                sizes="xs:88px lg:300px"
                loading="lazy"
                class="size-full object-cover"
              />
            </div>
            <div
              class="
                flex min-w-0 flex-col gap-0.75
                lg:gap-1.5 lg:px-4 lg:pt-3.5 lg:pb-4.5
              "
            >
              <p
                v-if="post.minutes"
                class="
                  text-xs text-muted
                  lg:text-[0.8125rem] lg:font-semibold
                "
              >
                {{ t('reading_minutes', { minutes: post.minutes }) }}
              </p>
              <h3
                class="
                  text-sm/[1.35] font-bold text-pretty wrap-anywhere
                  text-highlighted
                  group-hover:text-accent
                  lg:text-[1.0625rem]/[1.35]
                "
              >
                <NuxtLink
                  :to="post.to"
                  class="
                    line-clamp-3
                    after:absolute after:inset-0
                    focus-visible:outline-2 focus-visible:outline-secondary
                  "
                >
                  {{ post.title }}
                </NuxtLink>
              </h3>
            </div>
          </li>
        </ul>

        <!-- The scheme's inverted surface: white on a dark card, ink on a
             light one. Under the posts on a phone, under the copy on a desk. -->
        <UButton
          :to="ctaLink"
          :label="ctaText"
          color="neutral"
          variant="solid"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
          class="
            min-h-12 w-full justify-center px-5 text-[0.9375rem] font-bold
            lg:col-start-1 lg:row-start-2 lg:w-auto lg:self-start
            lg:justify-self-start
          "
        />
      </div>
    </UContainer>
  </section>
</template>

<i18n lang="yaml">
el:
  reading_minutes: '{minutes}′ ανάγνωσης'
en:
  reading_minutes: '{minutes} min read'
</i18n>
