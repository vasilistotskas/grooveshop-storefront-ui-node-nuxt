<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { BlogPost } from '~/types/blog/post'
import type { ImageLoading } from '~/types'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 387 },
  imgHeight: { type: Number, required: false, default: 275 },
  showShareButton: { type: Boolean, required: false, default: true },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
})

const { locale } = useI18n()
const localePath = useLocalePath()

const { post } = toRefs(props)

const postUrl = computed(() => {
  if (!post.value) return ''
  return `/blog/post/${post.value.id}/${post.value.slug}`
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
        :to="post.absoluteUrl"
        :text="alt"
        css-class="grid justify-center"
      >
        <ImgWithFallback
          :loading="imgLoading"
          provider="mediaStream"
          class="bg-primary-100 rounded-t-lg"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="post.mainImagePath"
          :height="imgHeight"
          fit="cover"
          sizes="sm:510px md:472px lg:562px xl:387px 2xl:387px"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          :background="'transparent'"
          :alt="`Image - ${alt}`"
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
        <h2 class="grid h-20">
          <Anchor
            :to="post.absoluteUrl"
            :text="alt"
            class="
              text-2xl font-bold tracking-tight text-primary-950

              dark:text-primary-50

              md:text-3xl
            "
          >
            {{ contentShorten(extractTranslated(post, 'title', locale), 100) }}
          </Anchor>
        </h2>
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
        <LazyUButton
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
          :title="$t('comments.count', {
            count: post.commentsCount,
          })"
          :label="String(post.commentsCount)"
          :to="localePath(`${post.absoluteUrl}#blog-post-comments`)"
        />
        <ClientOnly>
          <LazyUButton
            v-if="isSupported && showShareButton"
            :disabled="!isSupported"
            icon="i-heroicons-share"
            size="xl"
            color="primary"
            square
            variant="ghost"
            :title="$t('share')"
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
