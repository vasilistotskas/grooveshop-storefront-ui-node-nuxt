<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 480 },
  imgHeight: { type: Number, required: false, default: 315 },
  showShareButton: { type: Boolean, required: false, default: true },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
  as: {
    type: String,
    default: 'li',
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
  url: import.meta.client ? postUrl : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (err) {
    console.error('Share failed:', err)
  }
}

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
  <Component
    :is="as"
    class="
      bg-primary-100 text-primary-950 container grid w-full gap-6 rounded-lg
      !p-0

      dark:text-primary-50 dark:bg-primary-900
    "
  >
    <div class="grid">
      <Anchor
        :to="{ path: post.absoluteUrl }"
        :text="alt"
        css-class="grid justify-center"
      >
        <ImgWithFallback
          provider="mediaStream"
          :loading="imgLoading"
          class="bg-primary-100 rounded-t-lg"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="post.mainImagePath"
          :height="imgHeight"
          :width="imgWidth"
          fit="cover"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          :background="'transparent'"
          :alt="`Image - ${alt}`"
        />
      </Anchor>
    </div>
    <div class="grid gap-2 p-4">
      <div
        class="
          flex flex-col gap-4

          lg:gap-x-6

          md:gap-x-12
        "
      >
        <h2 class="grid h-20">
          <Anchor
            :to="{ path: post.absoluteUrl }"
            :text="contentShorten(extractTranslated(post, 'title', locale), 0, 39)"
            class="
              text-primary-950 text-2xl font-bold tracking-tight

              dark:text-primary-50

              md:text-3xl
            "
          />
        </h2>
      </div>
      <div class="flex justify-end gap-6 pt-5">
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
          :title="$t('comments.count', {
            count: post.commentsCount,
          })"
          :label="String(post.commentsCount)"
          :to="localePath({ path: post.absoluteUrl, hash: '#blog-post-comments' })"
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
  </Component>
</template>
