<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types/global/general'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 600 },
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
    class="container grid w-full gap-4 rounded-lg bg-white !p-0 text-white dark:bg-zinc-900 dark:text-black"
  >
    <div class="relative grid">
      <Anchor
        :to="`/blog/post${post.absoluteUrl}`"
        :text="alt"
        css-class="grid justify-center"
      >
        <ImgWithFallback
          :loading="imgLoading"
          provider="mediaStream"
          class="rounded-lg bg-white"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="src"
          :width="imgWidth"
          :height="imgHeight"
          :fit="'outside'"
          :position="'attention'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:480px sm:480px md:480px lg:480px xl:480px xxl:400px 2xl:400px`"
          :alt="`Image - ${alt}`"
          densities="x1"
        />
        <div class="absolute bottom-12 right-0 grid w-full">
          <span class="grid justify-center justify-items-start">
            <span
              class="m-auto block w-[70%] text-xl font-bold tracking-tight text-white dark:text-white md:text-4xl"
            >
              {{ extractTranslated(post, 'title', locale) }}
            </span>
          </span>
        </div>
      </Anchor>
      <div class="absolute bottom-4 right-4 grid items-end gap-2">
        <UButton
          icon="i-heroicons-heart"
          size="xl"
          color="white"
          square
          variant="ghost"
          class="flex-col justify-self-start p-0 font-extrabold capitalize text-white hover:bg-transparent dark:hover:bg-transparent"
          :label="String(post.likesCount)"
          :ui="{
            icon: {
              size: {
                xl: 'h-12 w-12',
              },
            },
          }"
        />
        <UButton
          icon="i-heroicons-chat-bubble-oval-left"
          size="xl"
          color="white"
          square
          variant="ghost"
          class="flex-col justify-self-start p-0 font-extrabold capitalize text-white hover:bg-transparent dark:hover:bg-transparent"
          :label="String(post.commentsCount)"
          :ui="{
            icon: {
              size: {
                xl: 'h-12 w-12',
              },
            },
          }"
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
            class="flex-col justify-self-start p-0 font-extrabold capitalize text-white hover:bg-transparent dark:hover:bg-transparent"
            :ui="{
              icon: {
                size: {
                  xl: 'h-12 w-12',
                },
              },
            }"
            @click="startShare"
          />
          <template #fallback>
            <ClientOnlyFallback height="48px" width="48px" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </li>
</template>
