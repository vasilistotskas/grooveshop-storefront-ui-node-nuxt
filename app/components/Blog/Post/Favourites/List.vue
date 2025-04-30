<script lang="ts" setup>
import type { PropType } from 'vue'

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

const { t, locale } = useI18n({ useScope: 'local' })
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

        lg:grid-cols-3

        md:grid-cols-2

        sm:grid-cols-2

        xl:grid-cols-4
      "
    >
      <template
        v-for="favourite in favourites"
        :key="favourite.id"
      >
        <UCard
          :ui="{
            body: 'p-2 sm:p-3',
          }"
        >
          <template #header>
            <Anchor
              :to="{ path: favourite.absoluteUrl }"
              :text="extractTranslated(favourite, 'title', locale)"
              css-class="grid justify-center"
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
            :to="{ path: favourite.absoluteUrl }"
            :text="extractTranslated(favourite, 'title', locale)"
            class="
              truncate text-primary-950 flex text-lg font-bold tracking-tight

              dark:text-primary-50

              md:h-14
            "
          >
            {{ contentShorten(extractTranslated(favourite, 'title', locale), 0, 52) }}
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
