<script lang="ts" setup>
import type { PropType } from 'vue'
import { clearCursorStates, getCursorFromUrl } from '~/utils/pagination'
import { type CursorStates, type PaginationCursorStateEnum } from '~/types'

const props = defineProps({
  cursorKey: {
    type: String as PropType<PaginationCursorStateEnum>,
    required: true,
  },
  links: {
    type: Object as PropType<{ next: string, previous: string }>,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  useRouteQuery: {
    type: Boolean,
    required: false,
    default: false,
  },
  strategy: {
    type: String as PropType<'button' | 'scroll'>,
    required: false,
    validator: (value: string) => ['button', 'scroll'].includes(value),
    default: 'button',
  },
  totalPages: {
    type: Number,
    required: true,
    default: 1,
  },
})

const { cursorKey, links, loading, useRouteQuery, strategy, totalPages } = toRefs(props)

const router = useRouter()
const route = useRoute()

const cursorState = useState<CursorStates>('cursorStates')

const currentState = computed(() => {
  return { ...cursorState.value }
})
const currentCursor = computed(() => {
  return currentState.value[cursorKey.value]
})

const nextCursor = computed(() => {
  if (!links.value?.next) return ''
  return getCursorFromUrl(links.value.next)
})

const handleScroll = () => {
  if (strategy.value !== 'scroll' || totalPages.value === 1) return

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    loadMore()
  }
}

const loadMore = async () => {
  if (!nextCursor.value || loading.value) return

  if (nextCursor.value !== currentCursor.value) {
    currentState.value[cursorKey.value] = nextCursor.value
    cursorState.value = currentState.value

    if (useRouteQuery.value) {
      await router.push({
        path: route.path,
        query: {
          ...route.query,
          cursor: nextCursor.value,
        },
      })
    }
  }
}

const showButton = computed(() => {
  if (strategy.value === 'scroll' || totalPages.value === 1) return false
  if (loading.value) return true
  if (nextCursor.value !== currentCursor.value) return true
  return false
})

watch(
  () => strategy.value,
  (newStrategy) => {
    if (import.meta.client) {
      if (newStrategy === 'scroll') {
        window.addEventListener('scroll', handleScroll)
      }
      else {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  clearCursorStates()
})
</script>

<template>
  <div class="cursor-pagination">
    <UButton
      v-if="nextCursor && showButton && strategy === 'button' && totalPages > 1"
      size="md"
      variant="soft"
      :label="$t('common.load.more')"
      :color="'primary'"
      :aria-label="$t('common.load.more')"
      :loading="loading"
      @click="loadMore"
    />
  </div>
</template>
