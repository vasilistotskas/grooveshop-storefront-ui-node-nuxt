<script lang="ts" setup>
import type { PropType } from 'vue'

const { blogPostUrl } = useUrls()

defineProps({
  favourites: {
    type: Array as PropType<BlogPost[] | null>,
    required: true,
  },
  favouritesCount: {
    type: Number,
    required: false,
    default: 0,
  },
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const { t, locale } = useI18n()
</script>

<template>
  <div
    v-if="favourites"
    class="grid w-full items-start gap-4"
  >
    <div
      v-if="displayTotal"
      class="flex items-center justify-center gap-1"
    >
      <span class="text-sm font-semibold">
        {{ t('favourites.count', favouritesCount) }}
      </span>
    </div>
    <ul
      class="
        grid grid-cols-1 gap-4
        sm:grid-cols-2
        md:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      <template
        v-for="favourite in favourites"
        :key="favourite.id"
      >
        <UCard
          :ui="{
            body: `
              p-2
              sm:p-3
            `,
          }"
        >
          <template #header>
            <Anchor
              :to="{ path: blogPostUrl(favourite.id, favourite.slug) }"
              :text="extractTranslated(favourite, 'title', locale)"
              :ui="{
                base: 'p-0',
              }"
            >
              <ImgWithFallback
                class="rounded-lg"
                :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
                :src="favourite.mainImagePath"
                :width="370"
                :height="370"
                fit="cover"
                :background="'transparent'"
                :modifiers="{
                  position: 'attention',
                  trimThreshold: 5,
                }"
                :alt="`Image - ${extractTranslated(favourite, 'title', locale)}`"
                densities="x2"
              />
            </Anchor>
          </template>

          <Anchor
            :to="{ path: blogPostUrl(favourite.id, favourite.slug) }"
            :text="extractTranslated(favourite, 'title', locale)"
            class="
              flex max-w-full truncate text-lg font-bold tracking-tight
              text-primary-950
              md:h-14
              dark:text-primary-50
            "
          >
            {{ contentShorten(extractTranslated(favourite, 'title', locale), 0, 20) }}
          </Anchor>
        </UCard>
      </template>
    </ul>
  </div>
</template>

<i18n lang="yaml">
el:
  favourites:
    count: Κανένα Αγαπημένο | 1 Αγαπημένο | {count} Αγαπημένα
</i18n>
