<script lang="ts" setup>
import type { PropType, Ref } from 'vue'

import type { BlogCommentOrderingField } from '~/types/blog/comment'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'

import emptyIcon from '~icons/mdi/package-variant-remove'

const props = defineProps({
  blogPostId: {
    type: String,
    required: true,
  },
  commentsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'blogPost'>,
    required: true,
    validator: (value: string) => ['user', 'blogPost'].includes(value),
  },
})

const { blogPostId, commentsCount, displayImageOf } = toRefs(props)

const { t } = useI18n()
const route = useRoute()

const ordering = computed(() => route.query.ordering || '-createdAt')
const expand = computed(() => 'true')

const {
  data: blogPostComments,
  pending,
  refresh,
} = await useFetch(`/api/blog/posts/${blogPostId.value}/comments`, {
  key: `blogPostComments${blogPostId.value}`,
  method: 'GET',
  query: {
    ordering: ordering.value,
    expand,
  },
})

const entityOrdering: Ref<EntityOrdering<BlogCommentOrderingField>> = ref([
  {
    value: 'id',
    label: t('common.ordering.id'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('common.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const orderingFields: Partial<
  Record<BlogCommentOrderingField, OrderingOption[]>
> = reactive({
  id: [],
  createdAt: [],
})

const orderingOptions = computed(() => {
  return useOrdering<BlogCommentOrderingField>(
    entityOrdering.value,
    orderingFields,
  )
})

watch(
  () => route.query,
  () => refresh(),
  { deep: true },
)
</script>

<template>
  <div
    class="mx-auto flex max-w-2xl flex-col items-start justify-center border-t border-gray-200 border-gray-900/10 pb-6 pt-6 dark:border-gray-50/20 dark:border-gray-700"
  >
    <template v-if="!pending && blogPostComments">
      <div class="grid gap-4">
        <h2 class="text-2xl font-semibold">
          {{ $t('components.blog.post.comments.title') }}
        </h2>
        <div class="grid justify-start gap-4 md:flex md:items-center">
          <div class="grid">
            <Ordering
              :ordering="String(ordering)"
              :ordering-options="orderingOptions.orderingOptionsArray.value"
            />
          </div>
        </div>
      </div>
      <div class="grid">
        <div class="grid gap-4">
          <BlogPostCommentsList
            v-if="blogPostComments && blogPostComments.length > 0"
            :comments-count="commentsCount"
            :comments="blogPostComments"
            :display-image-of="displayImageOf"
          />
          <EmptyState v-if="!pending && !blogPostComments" :icon="emptyIcon">
            <template #actions>
              <UButton
                :label="$t('common.empty.button')"
                :to="'index'"
                color="white"
              />
            </template>
          </EmptyState>
        </div>
      </div>
    </template>
  </div>
</template>
