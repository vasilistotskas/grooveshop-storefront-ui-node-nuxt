<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

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
  as: {
    type: String,
    default: 'li',
  },
})

const { locale } = useI18n()

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
      bg-primary-100 container grid min-h-60 w-full gap-4 rounded-lg !p-0

      dark:bg-primary-900 dark:text-primary-950
    "
  >
    <div class="relative grid">
      <Anchor
        :to="{ path: post.absoluteUrl }"
        :text="alt"
        css-class="grid justify-center"
      >
        <NuxtImg
          :loading="imgLoading"
          provider="mediaStream"
          class="bg-primary-100 rounded-lg"
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
          quality="100"
          :background="'transparent'"
          :alt="`Image - ${alt}`"
        />
        <div class="absolute bottom-12 right-0 grid w-full">
          <span class="grid justify-center justify-items-start">
            <h2
              class="
                text-primary-50 m-auto block w-[70%] text-3xl font-bold
                tracking-tight

                dark:text-primary-50

                lg:w-[76%]

                md:w-[66%] md:text-4xl

                sm:w-3/5
              "
            >
              {{ extractTranslated(post, 'title', locale) }}
            </h2>
          </span>
        </div>
      </Anchor>
      <div class="absolute bottom-4 right-4 grid items-end gap-2">
        <ButtonBlogPostLike
          class="
            text-primary-50 flex-col justify-self-start p-0 font-extrabold
            capitalize

            dark:text-primary-50 dark:hover:bg-transparent

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
            text-primary-50 flex-col justify-self-start p-0 font-extrabold
            capitalize

            dark:text-primary-50 dark:hover:bg-transparent

            hover:bg-transparent
          "
          :title="$t('comments.count', {
            count: post.commentsCount,
          })"
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
            :title="$t('share')"
            class="
              text-primary-50 flex-col justify-self-start p-0 font-extrabold
              capitalize

              dark:text-primary-50 dark:hover:bg-transparent

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
            <ClientOnlyFallback
              height="48px"
              width="48px"
            />
          </template>
        </ClientOnly>
      </div>
    </div>
  </Component>
</template>
