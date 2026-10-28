<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * «Δράσεις»: the co-op's blog, presented as its activities.
 *
 * The data is the platform index's, unchanged (`useBlogListing`: the same
 * request, key, URL filters and pagination), so only the drawing
 * differs: category chips and a live count between two dashed rules, the
 * first post of the page as a featured card, the rest as a card grid. A
 * post with no photograph becomes a sage card with the co-op's seal. There
 * are no like, comment or share counters.
 */

// Ten fit the grid: the featured card, then three rows of three.
const PAGE_SIZE = 10

const { t, locale } = useStoreI18n('components/variants/ekfyseosfyteias/Storefront/BlogIndex')
const { blogPostUrl } = useUrls()

useSeoMeta({
  description: t('description'),
  ogDescription: t('description'),
})
useHead({
  title: t('title'),
})

const {
  posts,
  status,
  pagination,
  categoryNames,
  pills,
  allPill,
  unfilteredTo,
  isFiltered,
  isFirstPage,
} = await useBlogListing({
  paginationType: PaginationTypeEnum.PAGE_NUMBER,
  pageSize: PAGE_SIZE,
  defaultOrdering: '-publishedAt',
})

const breadcrumb = computed(() => [
  { label: t('breadcrumb.home'), to: 'index' as const },
  { label: t('title') },
])

const cards = computed(() => (posts.value?.results ?? []).map(post => ({
  id: post.id,
  url: blogPostUrl(post.id, post.slug),
  title: extractTranslated(post, 'title', locale.value) ?? '',
  excerpt: extractTranslated(post, 'subtitle', locale.value) ?? '',
  image: post.mainImagePath,
  category: categoryNames.value.get(post.category),
  publishedAt: post.publishedAt,
})))

const featured = computed(() => isFirstPage.value ? cards.value[0] : undefined)
const rest = computed(() => featured.value ? cards.value.slice(1) : cards.value)

const total = computed(() => pagination.value?.count ?? 0)

const CHIP = `
  inline-flex min-h-11 items-center rounded-full border-2 px-[18px] text-[15px]
  font-semibold
  focus-visible:outline-3 focus-visible:outline-offset-3
  focus-visible:outline-(color:--fy-focus)
`
const CHIP_ON = 'border-(color:--fy-text) bg-(--fy-text) text-(--fy-ground)'
const CHIP_OFF = `
  border-(color:--fy-text-muted) text-(--fy-text)
  hover:bg-(--fy-raised)
`
</script>

<template>
  <div class="bg-(--fy-ground) text-(--fy-text)">
    <div
      class="
        mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-6
        pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)]
      "
    >
      <header
        class="
          grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))]
          items-end gap-x-16 gap-y-6
        "
      >
        <div class="flex flex-col gap-4.5">
          <VariantsEkfyseosfyteiasBlogBreadcrumb :items="breadcrumb" />
          <h1
            class="
              font-display text-[length:clamp(48px,6vw,88px)] leading-[0.98]
              font-extrabold tracking-[-0.02em]
            "
          >
            {{ t('title') }}
          </h1>
        </div>
        <p class="text-[18px] leading-[1.65] text-pretty text-(--fy-text-muted)">
          {{ t('lead') }}
        </p>
      </header>

      <div
        class="
          flex flex-wrap items-center justify-between gap-x-6 gap-y-3
          border-y-[1.5px] border-dashed border-(color:--fy-rule) py-4
        "
      >
        <nav
          v-if="pills.length"
          :aria-label="t('filter_label')"
        >
          <ul class="flex flex-wrap gap-2">
            <li>
              <NuxtLink
                :to="allPill.to"
                :aria-current="allPill.active ? 'true' : undefined"
                :class="[CHIP, allPill.active ? CHIP_ON : CHIP_OFF]"
              >
                {{ t('all') }}
              </NuxtLink>
            </li>
            <li
              v-for="pill in pills"
              :key="pill.id"
            >
              <NuxtLink
                :to="pill.to"
                :aria-current="pill.active ? 'true' : undefined"
                :class="[CHIP, pill.active ? CHIP_ON : CHIP_OFF]"
              >
                {{ pill.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <p
          aria-live="polite"
          class="text-[15px] text-(--fy-text-muted)"
        >
          {{ t('count', { count: total }, total) }}
        </p>
      </div>

      <article
        v-if="featured"
        class="
          grid grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))]
          overflow-hidden rounded-[28px] bg-(--fy-surface)
        "
      >
        <ImgWithFallback
          v-if="featured.image"
          :src="featured.image"
          alt=""
          :width="960"
          :height="720"
          sizes="xs:100vw sm:100vw md:100vw lg:640px"
          fit="cover"
          :modifiers="{ position: 'attention' }"
          quality="80"
          densities="x1 x2"
          loading="eager"
          fetchpriority="high"
          preload
          class="block size-full min-h-[340px] object-cover"
        />
        <div
          v-else
          class="flex min-h-[340px] items-center justify-center bg-(--fy-sage)"
        >
          <VariantsEkfyseosfyteiasBlogSeal />
        </div>

        <div
          class="
            flex flex-col items-start gap-4 p-[clamp(28px,4vw,56px)]
          "
        >
          <p class="flex flex-wrap items-center gap-2.5">
            <span
              v-if="featured.category"
              class="
                rounded-full bg-(--fy-raised) px-3 py-[5px] text-[13px]
                font-semibold text-(--fy-eyebrow)
              "
            >{{ featured.category }}</span>
            <NuxtTime
              v-if="featured.publishedAt"
              :datetime="featured.publishedAt"
              :locale="locale"
              time-zone="UTC"
              day="numeric"
              month="long"
              year="numeric"
              class="text-sm font-semibold text-(--fy-accent-text)"
            />
          </p>
          <h2
            class="
              font-display text-[length:clamp(32px,3.4vw,50px)] leading-[1.04]
              font-extrabold text-balance
            "
          >
            {{ featured.title }}
          </h2>
          <p
            v-if="featured.excerpt"
            class="text-[17.5px] leading-[1.7] text-(--fy-text-muted)"
          >
            {{ featured.excerpt }}
          </p>
          <PageSectionVariantsEkfyseosfyteiasLink
            :to="featured.url"
            look="ink"
            arrow
            class="mt-2"
          >
            {{ t('read_featured') }}<span class="sr-only">: {{ featured.title }}</span>
          </PageSectionVariantsEkfyseosfyteiasLink>
        </div>
      </article>

      <ul
        v-if="rest.length"
        class="
          grid list-none grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))]
          gap-5 p-0
        "
      >
        <li
          v-for="card in rest"
          :key="card.id"
          class="flex flex-col overflow-hidden rounded-3xl"
          :class="card.image
            ? 'bg-(--fy-surface) shadow-[0_1px_0_rgb(28_26_23/8%)]'
            : 'bg-(--fy-sage)'"
        >
          <ImgWithFallback
            v-if="card.image"
            :src="card.image"
            alt=""
            :width="640"
            :height="480"
            sizes="xs:100vw sm:50vw md:50vw lg:33vw xl:400px"
            fit="cover"
            :modifiers="{ position: 'attention' }"
            quality="80"
            densities="x1 x2"
            loading="lazy"
            class="block aspect-4/3 w-full object-cover"
          />
          <div
            v-else
            class="px-[26px] pt-[26px]"
          >
            <VariantsEkfyseosfyteiasBlogSeal />
          </div>

          <div class="flex flex-1 flex-col gap-2.5 px-[26px] pt-6 pb-[26px]">
            <p class="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <span
                v-if="card.category"
                class="rounded-full px-[11px] py-1 text-[12.5px] font-semibold text-(--fy-eyebrow)"
                :class="card.image ? 'bg-(--fy-raised)' : 'bg-(--fy-ground)'"
              >{{ card.category }}</span>
              <NuxtTime
                v-if="card.publishedAt"
                :datetime="card.publishedAt"
                :locale="locale"
                time-zone="UTC"
                day="numeric"
                month="long"
                year="numeric"
                class="text-[13.5px] font-semibold"
                :class="card.image ? 'text-(--fy-accent-text)' : 'text-(--fy-text)'"
              />
            </p>
            <h3 class="font-display text-[23px] leading-[1.15] font-bold">
              {{ card.title }}
            </h3>
            <p
              v-if="card.excerpt"
              class="text-[15px] leading-[1.6]"
              :class="card.image ? 'text-(--fy-text-muted)' : 'text-(--fy-text)'"
            >
              {{ card.excerpt }}
            </p>
            <div class="mt-auto">
              <PageSectionVariantsEkfyseosfyteiasLink :to="card.url">
                {{ t('read') }}<span class="sr-only">: {{ card.title }}</span>
              </PageSectionVariantsEkfyseosfyteiasLink>
            </div>
          </div>
        </li>
      </ul>

      <div
        v-if="status === 'success' && !cards.length"
        class="flex flex-col items-start gap-4"
      >
        <p class="font-display text-[28px] leading-[1.15] font-bold">
          {{ isFiltered ? t('empty_filtered') : t('empty') }}
        </p>
        <NuxtLink
          v-if="isFiltered"
          :to="unfilteredTo"
          :class="[CHIP, CHIP_OFF]"
        >
          {{ t('all') }}
        </NuxtLink>
      </div>

      <div
        v-if="pagination && (pagination.totalPages ?? 1) > 1"
        class="flex justify-center"
      >
        <Pagination
          :count="pagination.count"
          :links="pagination.links"
          :loading="status === 'pending'"
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-total-results="pagination.pageTotalResults"
          :pagination-type="PaginationTypeEnum.PAGE_NUMBER"
          :total-pages="pagination.totalPages"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Δράσεις
  lead: Δράσεις που οργανώνει ο συνεταιρισμός μας ή στις οποίες συμμετέχει, στο πλαίσιο της κοινωφελούς δραστηριότητάς του, και οι εκθέσεις όπου στήνουμε τον πάγκο μας.
  description: "Οι δράσεις του συνεταιρισμού μας: εκδηλώσεις, εργαστήρια και εκθέσεις όπου στήνουμε τον πάγκο μας, με φωτογραφίες και ιστορίες από κάθε δράση."
  breadcrumb:
    home: Αρχική
  filter_label: Φίλτρο κατηγορίας
  all: Όλες
  count: '{count} δράση | {count} δράσεις'
  read_featured: Διαβάστε τη δράση
  read: Διαβάστε
  empty: Δεν υπάρχουν δράσεις ακόμη.
  empty_filtered: Καμία δράση δεν ταιριάζει.
en:
  title: Activities
  lead: Activities our co-operative organises or takes part in as part of its public-benefit work, and the fairs where we set up our stall.
  description: "The activities of our co-operative: events, workshops and the fairs where we set up our stall, with photos and stories from every activity."
  breadcrumb:
    home: Home
  filter_label: Filter by category
  all: All
  count: '{count} activity | {count} activities'
  read_featured: Read about the activity
  read: Read
  empty: There are no activities yet.
  empty_filtered: No activity matches.
</i18n>
