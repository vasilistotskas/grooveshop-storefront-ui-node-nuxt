<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types/global/general'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 420 },
  imgHeight: { type: Number, required: false, default: 220 },
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
    class="container grid w-full gap-6 rounded-lg bg-white !p-0 text-white dark:bg-zinc-800 dark:text-black"
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
          class="rounded-t-lg bg-white"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="src"
          :width="imgWidth"
          :height="imgHeight"
          :fit="'cover'"
          :position="'center'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:380px 2xl:380px`"
          :alt="`Image - ${alt}`"
          densities="x1"
        />
      </Anchor>
    </div>
    <div class="grid p-5">
      <div class="flex flex-col gap-4 md:gap-x-12 lg:gap-x-6">
        <h3 class="grid h-20">
          <Anchor
            :to="`/blog/post${post.absoluteUrl}`"
            :text="alt"
            class="text-2xl font-bold tracking-tight text-black dark:text-white md:text-3xl"
          >
            {{ contentShorten(extractTranslated(post, 'title', locale), 100) }}
          </Anchor>
        </h3>
      </div>
      <div class="flex justify-end gap-6">
        <UButton
          icon="i-heroicons-heart"
          size="xl"
          color="white"
          square
          variant="ghost"
          class="text-primary-800 dark:text-primary-100 flex-col justify-self-start p-0 font-extrabold capitalize hover:bg-transparent dark:hover:bg-transparent"
          :label="String(post.likesCount)"
        />
        <UButton
          icon="i-heroicons-chat-bubble-oval-left"
          size="xl"
          color="white"
          square
          variant="ghost"
          class="text-primary-800 dark:text-primary-100 flex-col justify-self-start p-0 font-extrabold capitalize hover:bg-transparent dark:hover:bg-transparent"
          :label="String(post.commentsCount)"
        />
        <ClientOnly>
          <UButton
            v-if="isSupported && showShareButton"
            :disabled="!isSupported"
            icon="i-heroicons-share"
            size="xl"
            color="white"
            square
            variant="ghost"
            class="text-primary-800 dark:text-primary-100 flex-col justify-self-start p-0 font-extrabold capitalize hover:bg-transparent dark:hover:bg-transparent"
            @click="startShare"
          />
          <template #fallback>
            <ClientOnlyFallback height="40px" width="40px" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </li>
</template>
