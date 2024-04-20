<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 600 },
  imgHeight: { type: Number, required: false, default: 750 },
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
const startShare = () => share().catch(err => err)

const likeClicked = async (event: { blogPostId: number, liked: boolean }) => {
  if (event.liked) {
    post.value.likesCount++
  }
  else {
    post.value.likesCount--
  }
}
</script>

<template>
  <li
    class="
      bg-primary-100 container grid w-full gap-4 rounded-lg !p-0 text-white

      dark:bg-primary-900 dark:text-black
    "
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
          class="bg-primary-100 rounded-lg"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="src"
          :width="imgWidth"
          :height="imgHeight"
          :fit="'outside'"
          :position="'attention'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:600px sm:600px md:360px lg:600px xl:600px`"
          :alt="`Image - ${alt}`"
          densities="x1"
        />
        <div class="absolute bottom-12 right-0 grid w-full">
          <span class="grid justify-center justify-items-start">
            <span
              class="
                m-auto block w-[70%] text-3xl font-bold tracking-tight
                text-white

                dark:text-white

                lg:w-[76%]

                md:w-[66%] md:text-4xl

                sm:w-[60%]
              "
            >
              {{ extractTranslated(post, 'title', locale) }}
            </span>
          </span>
        </div>
      </Anchor>
      <div class="absolute bottom-4 right-4 grid items-end gap-2">
        <ButtonBlogPostLike
          class="
            flex-col justify-self-start p-0 font-extrabold capitalize text-white

            dark:hover:bg-transparent

            hover:bg-transparent
          "
          size="xl"
          variant="ghost"
          :blog-post-id="post.id"
          :likes-count="post.likesCount"
          @update="likeClicked"
        />
        <UButton
          icon="i-heroicons-chat-bubble-oval-left"
          size="xl"
          color="primary"
          square
          variant="ghost"
          class="
            flex-col justify-self-start p-0 font-extrabold capitalize text-white

            dark:hover:bg-transparent

            hover:bg-transparent
          "
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
            color="primary"
            square
            variant="ghost"
            class="
              flex-col justify-self-start p-0 font-extrabold capitalize
              text-white

              dark:hover:bg-transparent

              hover:bg-transparent
            "
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
