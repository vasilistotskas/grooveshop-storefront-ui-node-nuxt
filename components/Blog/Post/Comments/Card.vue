<script lang="ts" setup>
import type { PropType } from 'vue'

import type { BlogComment } from '~/types/blog/comment'

const props = defineProps({
  comment: {
    type: Object as PropType<BlogComment>,
    required: true,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'blogPost'>,
    required: true,
    validator: (value: string) => ['user', 'blogPost'].includes(value),
  },
})

const { comment, displayImageOf } = toRefs(props)

const blogPost = computed(() => getEntityObject(comment?.value?.post))
const userAccount = computed(() => getEntityObject(comment?.value?.user))

const { resolveImageSrc } = useImageResolver()
const { locale } = useI18n()
const { contentShorten } = useText()

const src = computed(() => {
  const path =
    displayImageOf.value === 'user'
      ? `media/uploads/users/`
      : `media/uploads/blog/`
  return resolveImageSrc(
    displayImageOf.value === 'user'
      ? userAccount.value?.mainImageFilename
      : blogPost.value?.mainImageFilename,
    path +
      (displayImageOf.value === 'user'
        ? userAccount.value?.mainImageFilename
        : blogPost.value?.mainImageFilename),
  )
})

const alt = computed(() => {
  return displayImageOf.value === 'user'
    ? userAccount.value?.firstName + ' ' + userAccount.value?.lastName
    : extractTranslated(blogPost?.value, 'title', locale.value)
})

const blogPostName = computed(() =>
  extractTranslated(blogPost?.value, 'title', locale.value),
)

const commentContent = computed(() => {
  return contentShorten(
    extractTranslated(comment?.value, 'content', locale.value),
    0,
    120,
  )
})
</script>

<template>
  <div class="card">
    <div
      class="relative flex flex-col items-start justify-start gap-2 md:gap-14"
    >
      <div class="flex w-full items-center gap-6">
        <div class="flex w-full items-center">
          <div class="flex items-center gap-4">
            <UserAvatar
              v-if="userAccount && displayImageOf === 'user'"
              :user-account="userAccount"
              :show-name="false"
            />
            <span
              v-if="userAccount && displayImageOf === 'user'"
              class="text-primary-800 dark:text-primary-100 font-bold"
            >
              {{ userAccount?.firstName }}
            </span>
            <div
              v-if="displayImageOf === 'blogPost' && blogPost"
              class="grid gap-2"
            >
              <Anchor
                :to="`/blog/post${blogPost.absoluteUrl}`"
                :text="blogPostName"
              >
                <ImgWithFallback
                  loading="lazy"
                  provider="mediaStream"
                  class="blog-post-img w-30 h-20 bg-white object-cover"
                  sizes="sm:100vw md:50vw lg:auto"
                  :src="src"
                  :alt="alt"
                />
              </Anchor>
            </div>
          </div>
          <NuxtTime
            class="w-full text-end text-xs"
            :datetime="comment.createdAt"
          />
        </div>
      </div>
      <div class="grid h-full w-full">
        <div
          v-if="displayImageOf === 'blogPost' && blogPost"
          class="grid gap-4 text-2xl"
        >
          <Anchor
            :to="`/blog/post${blogPost.absoluteUrl}`"
            :text="blogPostName"
          >
            <span class="text-lg font-medium">{{ blogPostName }}</span>
          </Anchor>
        </div>
        <span class="pb-6 md:pb-10">{{ commentContent }}</span>
        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            :label="$t('common.like')"
            :icon="'i-heroicons-heart'"
            :color="'white'"
            :aria-label="$t('common.like')"
            trailing
          />
          <UButton
            size="sm"
            :label="$t('common.reply')"
            :icon="'i-heroicons-chat-bubble-left-ellipsis'"
            :color="'white'"
            :aria-label="$t('common.reply')"
            trailing
          />
        </div>
      </div>
    </div>
  </div>
</template>
