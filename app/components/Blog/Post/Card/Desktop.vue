<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

const { blogPostUrl } = useUrls()

const localLikesCount = ref(0)

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: {
    type: Number,
    required: false,
    default() {
      const { isMobileOrTablet } = useDevice()
      return isMobileOrTablet ? 480 : 376
    },
  },
  imgHeight: {
    type: Number,
    required: false,
    default() {
      const { isMobileOrTablet } = useDevice()
      return isMobileOrTablet ? 315 : 247
    },
  },
  showShareButton: { type: Boolean, required: false, default: true },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
  imgFetchPriority: {
    type: String,
    required: false,
    default: 'auto',
    validator: (value: string) => ['high', 'low', 'auto'].includes(value),
  },
  preload: {
    type: Boolean,
    required: false,
    default: false,
  },
  as: {
    type: String,
    default: 'li',
  },
})

const { locale } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

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
  catch (error) {
    console.error('Share failed:', error)
  }
}

watchEffect(() => {
  if (post.value?.likesCount !== undefined) {
    localLikesCount.value = post.value.likesCount
  }
})

const likeClicked = async (event: { blogPostId: number, liked: boolean }) => {
  if (event.liked) {
    localLikesCount.value++
  }
  else {
    localLikesCount.value--
  }
}
</script>

<template>
  <Component
    :is="as"
    class="
      container grid w-full gap-6 rounded-lg bg-primary-100 !p-0
      text-primary-950
      dark:bg-primary-900 dark:text-primary-50
    "
  >
    <div class="grid">
      <Anchor
        :to="{ path: blogPostUrl(post.id, post.slug) }"
        :text="alt"
        :ui="{
          base: 'p-0',
        }"
      >
        <ImgWithFallback
          :loading="imgLoading"
          :fetchpriority="imgFetchPriority"
          :preload="preload"
          class="rounded-t-lg bg-primary-100"
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
          md:gap-x-12
          lg:gap-x-6
        "
      >
        <h2 class="grid h-20">
          <Anchor
            :to="{ path: blogPostUrl(post.id, post.slug) }"
            :text="contentShorten(extractTranslated(post, 'title', locale), 0, 39)"
            class="
              text-2xl font-bold tracking-tight text-primary-950
              md:text-3xl
              dark:text-primary-50
            "
            :ui="{
              base: 'items-start p-0 text-start',
            }"
          />
        </h2>
      </div>
      <div class="flex justify-end gap-6 pt-5">
        <ButtonBlogPostLike
          :blog-post-id="post.id"
          :likes-count="localLikesCount"
          @update="likeClicked"
        />
        <UButton
          icon="i-heroicons-chat-bubble-oval-left"
          size="xl"
          square
          color="neutral"
          variant="ghost"
          :title="$i18n.t('comments.count', {
            count: post.commentsCount,
          })"
          :label="String(post.commentsCount)"
          :to="localePath({ path: blogPostUrl(post.id, post.slug), hash: '#blog-post-comments' })"
          :ui="{
            base: `
              flex cursor-pointer flex-col items-center gap-1 p-0
              hover:bg-transparent
            `,
          }"
        />
        <ClientOnly>
          <UButton
            v-if="isSupported && showShareButton"
            :disabled="!isSupported"
            icon="i-heroicons-share"
            size="xl"
            square
            color="neutral"
            variant="ghost"
            :title="$i18n.t('share')"
            :ui="{
              base: `
                flex cursor-pointer flex-col items-center gap-1 p-0
                hover:bg-transparent
              `,
            }"
            @click="startShare"
          />
          <template #fallback>
            <USkeleton
              class="h-6 w-6"
            />
          </template>
        </ClientOnly>
      </div>
    </div>
  </Component>
</template>
