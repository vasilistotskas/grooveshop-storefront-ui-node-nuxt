<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

const { blogPostUrl } = useUrls()

const localLikesCount = ref(0)

const props = defineProps({
  post: { type: Object as PropType<BlogPost>, required: true },
  imgWidth: { type: Number, required: false, default: 575 },
  imgHeight: { type: Number, required: false, default: 670 },
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
  return localePath({ name: 'blog-post-id-slug', params: { id: post.value.id, slug: post.value.slug } })
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
      container grid min-h-60 w-full gap-4 rounded-lg bg-primary-100 !p-0
      dark:bg-primary-900 dark:text-primary-950
    "
  >
    <div class="relative grid">
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
          class="rounded-lg bg-primary-100"
          :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
          :src="post.mainImagePath"
          :width="imgWidth"
          :height="imgHeight"
          sizes="xs:382px sm:352px md:545px lg:562px xl:387px xxl:387px 2xl:387px"
          fit="cover"
          :modifiers="{
            position: 'attention',
            trimThreshold: 5,
          }"
          quality="80"
          :background="'transparent'"
          :alt="`Image - ${alt}`"
        />
        <h2
          class="
            absolute right-0 bottom-12 grid w-full justify-center
            justify-items-start
          "
        >
          <span
            class="
              m-auto block w-[70%] text-start text-3xl font-bold tracking-tight
              text-primary-50
              sm:w-3/5
              md:w-[66%] md:text-4xl
              lg:w-[76%]
              dark:text-primary-50
            "
          >
            {{ extractTranslated(post, 'title', locale) }}
          </span>
        </h2>
      </Anchor>
      <div class="absolute right-4 bottom-4 grid items-end gap-2">
        <ButtonBlogPostLike
          :blog-post-id="post.id"
          :likes-count="localLikesCount"
          size="3xl"
          @update="likeClicked"
        />
        <UButton
          icon="i-heroicons-chat-bubble-oval-left"
          size="3xl"
          square
          color="neutral"
          variant="ghost"
          :title="$i18n.t('comments.count', {
            count: post.commentsCount,
          })"
          :to="localePath({ path: blogPostUrl(post.id, post.slug), hash: '#blog-post-comments' })"
          :label="String(post.commentsCount)"
          :ui="{
            base: `
              flex cursor-pointer flex-col items-center gap-1 p-0 text-white
              hover:bg-transparent
              md:text-black
              dark:text-white
              dark:md:text-white
            `,
          }"
        />
        <ClientOnly>
          <UButton
            v-if="isSupported && showShareButton"
            :disabled="!isSupported"
            icon="i-heroicons-share"
            size="3xl"
            square
            color="neutral"
            variant="ghost"
            :title="$i18n.t('share')"
            :ui="{
              base: `
                flex cursor-pointer flex-col items-center gap-1 p-0 text-white
                hover:bg-transparent
                md:text-black
                dark:text-white
                dark:md:text-white
              `,
            }"
            @click="startShare"
          />
          <template #fallback>
            <USkeleton
              class="h-12 w-12"
            />
          </template>
        </ClientOnly>
      </div>
    </div>
  </Component>
</template>
