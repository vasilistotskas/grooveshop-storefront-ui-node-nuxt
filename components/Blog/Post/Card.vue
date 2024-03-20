<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types/global/general'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 380 },
  imgHeight: { type: Number, required: false, default: 280 },
  showShareButton: { type: Boolean, required: false, default: true },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
})

const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()
const { contentShorten } = useText()

const { post } = toRefs(props)

const postUrl = computed(() => {
  if (!props.post) return ''
  return `/blog/post/${post.value.id}/${post.value.slug}`
})

const src = computed(() => {
  return resolveImageSrc(
    post.value?.mainImageFilename,
    `media/uploads/blog/${post.value?.mainImageFilename}`,
  )
})

const alt = computed(() => {
  return extractTranslated(post.value, 'title', locale.value)
})

const shareOptions = reactive({
  title: extractTranslated(post.value, 'title', locale.value),
  text: extractTranslated(post.value, 'subtitle', locale.value) || '',
  url: isClient ? postUrl : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)
</script>

<template>
  <li
    class="container grid w-full gap-4 rounded-lg bg-white !p-5 text-white dark:bg-zinc-800 dark:text-black"
  >
    <div class="grid">
      <Anchor
        :to="`/blog/post${post.absoluteUrl}`"
        :text="alt"
        css-class="grid justify-center"
      >
        <ImgWithFallback
          :loading="imgLoading"
          provider="mediaStream"
          class="bg-white"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="src"
          :width="imgWidth"
          :height="imgHeight"
          :fit="'contain'"
          :position="'entropy'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:400px 2xl:400px`"
          :alt="alt"
          densities="x1"
        />
      </Anchor>
    </div>
    <ClientOnly>
      <UButton
        v-if="isSupported && showShareButton"
        :disabled="!isSupported"
        icon="i-heroicons-share"
        size="lg"
        color="white"
        square
        variant="solid"
        class="justify-self-start font-extrabold capitalize"
        @click="startShare"
      />
      <template #fallback>
        <ClientOnlyFallback height="40px" width="40px" />
      </template>
    </ClientOnly>
    <div class="flex flex-col gap-4 md:gap-x-12 lg:gap-x-6">
      <div class="grid">
        <h3 class="grid h-28">
          <Anchor
            :to="`/blog/post${post.absoluteUrl}`"
            :text="alt"
            class="text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl"
          >
            {{ extractTranslated(post, 'title', locale) }}
          </Anchor>
        </h3>
        <div class="grid">
          <span class="text-primary-700 dark:text-primary-100 text-sm">
            {{ post.publishedAt }}
          </span>
        </div>
      </div>
      <div class="grid gap-2 md:gap-4">
        <div class="grid h-20">
          <p class="text-primary-700 dark:text-primary-100 text-sm">
            {{
              contentShorten(extractTranslated(post, 'subtitle', locale), 100)
            }}
          </p>
        </div>
        <div class="flex items-center justify-end">
          <div class="relative mr-4 h-12 w-12">
            <ImgWithFallback
              loading="lazy"
              provider="mediaStream"
              class="rounded-full bg-white"
              :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
              :src="src"
              :width="90"
              :height="90"
              :fit="'contain'"
              :position="'entropy'"
              :background="'transparent'"
              :trim-threshold="5"
              sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:90px 2xl:90px`"
              :alt="alt"
              densities="x1"
            />
          </div>
          <div v-if="!isEntityId(post.author)" class="grid">
            <span
              v-if="!isEntityId(post.author.user)"
              class="text-primary-700 dark:text-primary-100 text-sm font-bold"
            >
              {{ post.author.user.firstName }} {{ post.author.user.lastName }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>
