<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 490 },
  imgHeight: { type: Number, required: false, default: 260 },
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
const localePath = useLocalePath()

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
      bg-primary-100 container grid w-full gap-6 rounded-lg !p-0
      text-primary-950

      dark:text-primary-50 dark:bg-primary-900
    "
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
          class="bg-primary-100 rounded-t-lg"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="src"
          :width="imgWidth"
          :height="imgHeight"
          :fit="'cover'"
          :position="'center'"
          :background="'transparent'"
          :trim-threshold="5"
          sizes="`xs:610px sm:297px md:361px lg:387px xl:335px xxl:490px 2xl:490px`"
          :alt="`Image - ${alt}`"
          densities="x1"
        />
      </Anchor>
    </div>
    <div class="grid p-5">
      <div
        class="
          flex flex-col gap-4

          lg:gap-x-6

          md:gap-x-12
        "
      >
        <h3 class="grid h-20">
          <Anchor
            :to="`/blog/post${post.absoluteUrl}`"
            :text="alt"
            class="
              text-2xl font-bold tracking-tight text-primary-950

              dark:text-primary-50

              md:text-3xl
            "
          >
            {{ contentShorten(extractTranslated(post, 'title', locale), 100) }}
          </Anchor>
        </h3>
      </div>
      <div class="flex justify-end gap-6">
        <ButtonBlogPostLike
          class="
            text-primary-950 flex-col justify-self-start p-0 font-extrabold
            capitalize

            dark:text-primary-50 dark:hover:bg-transparent

            hover:bg-transparent
          "
          size="lg"
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
            text-primary-950 flex-col justify-self-start p-0 font-extrabold
            capitalize

            dark:text-primary-50 dark:hover:bg-transparent

            hover:bg-transparent
          "
          :title="$t('common.comments.count', {
            count: post.commentsCount,
          })"
          :label="String(post.commentsCount)"
          :to="localePath(`/blog/post${post.absoluteUrl}#blog-post-comments`)"
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
            :title="$t('common.share')"
            class="
              text-primary-950 flex-col justify-self-start p-0 font-extrabold
              capitalize

              dark:text-primary-50 dark:hover:bg-transparent

              hover:bg-transparent
            "
            @click="startShare"
          />
          <template #fallback>
            <ClientOnlyFallback
              height="24px"
              width="24px"
            />
          </template>
        </ClientOnly>
      </div>
    </div>
  </li>
</template>
