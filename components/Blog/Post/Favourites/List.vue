<script lang="ts" setup>
import type { PropType } from 'vue'
import type { BlogPost } from '~/types/blog/post'

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

const { resolveImageSrc } = useImageResolver()
const { locale } = useI18n()
</script>

<template>
  <div v-if="favourites" class="grid w-full items-start gap-4">
    <div v-if="displayTotal" class="flex items-center justify-center gap-1">
      <span class="text-sm font-semibold text-secondary">
        {{ $t('components.favourite.list.favourites.total', favouritesCount) }}
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
      <template v-for="favourite in favourites" :key="favourite.id">
        <UCard>
          <template #header>
            <Anchor
              :to="`/blog/post${favourite.absoluteUrl}`"
              :text="extractTranslated(favourite, 'title', locale)"
              css-class="grid justify-center"
            >
              <ImgWithFallback
                provider="mediaStream"
                class="rounded-lg"
                :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
                :src="resolveImageSrc(
                  favourite.mainImageFilename,
                  `media/uploads/blog/${favourite.mainImageFilename}`,
                )"
                :width="370"
                :height="370"
                :fit="'cover'"
                :position="'center'"
                :background="'transparent'"
                :trim-threshold="5"
                :alt="`Image - ${extractTranslated(favourite, 'title', locale)}`"
                densities="x2"
              />
            </Anchor>
          </template>

          <Anchor
            :to="`/blog/post${favourite.absoluteUrl}`"
            :text="extractTranslated(favourite, 'title', locale)"
            class="
              flex text-lg font-bold tracking-tight text-black

              dark:text-white

              md:h-14
            "
          >
            {{ contentShorten(extractTranslated(favourite, 'title', locale), 100) }}
          </Anchor>
        </UCard>
      </template>
    </ul>
  </div>
</template>
