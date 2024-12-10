<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch, toRefs } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { PropType } from 'vue'

const getCursorFromUrl = (url: string): string => {
  try {
    const params = new URLSearchParams(url.split('?')[1])
    return params.get('cursor') || ''
  }
  catch {
    console.error('Invalid URL for cursor extraction:', url)
    return ''
  }
}

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

const cursorState = useState<CursorState>('cursor-state')

const currentState = computed(() => ({ ...cursorState.value }))
const currentCursor = computed(() => currentState.value[cursorKey.value])

const nextCursor = computed(() => {
  if (!links.value?.next) return ''
  return getCursorFromUrl(links.value.next)
})

const hasMore = computed(() => {
  return nextCursor.value !== '' && totalPages.value > 1
})

const showButton = computed(() => {
  if (strategy.value === 'scroll' || totalPages.value === 1) return false
  if (loading.value) return true
  return nextCursor.value !== currentCursor.value
})

const showLoadMoreButton = computed(() => {
  return (
    nextCursor.value
    && showButton.value
    && strategy.value === 'button'
    && totalPages.value > 1
  )
})

const infiniteScrollTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const loadMore = async () => {
  if (!nextCursor.value || loading.value) return

  if (nextCursor.value !== currentCursor.value) {
    currentState.value[cursorKey.value] = nextCursor.value
    cursorState.value = currentState.value

    if (useRouteQuery.value) {
      try {
        await router.push({
          path: route.path,
          query: {
            ...route.query,
            cursor: nextCursor.value,
          },
        })
      }
      catch (error) {
        console.error('Router push failed:', error)
      }
    }
  }
}

const createObserver = () => {
  if (strategy.value !== 'scroll' || !infiniteScrollTrigger.value || !hasMore.value) return

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore()
          }
        })
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.25,
      },
    )

    observer.observe(infiniteScrollTrigger.value)
  }
  else {
    console.warn('IntersectionObserver is not supported by this browser.')
    loadMore()
  }
}

const destroyObserver = () => {
  if (observer && infiniteScrollTrigger.value) {
    observer.unobserve(infiniteScrollTrigger.value)
    observer.disconnect()
    observer = null
  }
}

const handleResize = () => {
  if (observer) {
    destroyObserver()
    createObserver()
  }
}

const debouncedHandleResize = useDebounceFn(() => {
  handleResize()
}, 300)

onMounted(() => {
  createObserver()
  window.addEventListener('resize', debouncedHandleResize)
})

watch(
  () => strategy.value,
  (newStrategy) => {
    destroyObserver()
    if (newStrategy === 'scroll') {
      createObserver()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  destroyObserver()
  window.removeEventListener('resize', debouncedHandleResize)
  clearCursorState()
})
</script>

<template>
  <div class="cursor-pagination">
    <div
      v-if="strategy === 'scroll' && hasMore"
      ref="infiniteScrollTrigger"
      class="infinite-scroll-trigger"
    />
    <UButton
      v-if="showLoadMoreButton"
      size="md"
      variant="soft"
      :label="$t('load.more')"
      color="primary"
      aria-label="Load more posts"
      :loading="loading"
      @click="loadMore"
    />
  </div>
</template>

<style scoped lang="scss">
.cursor-pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;

  .infinite-scroll-trigger {
    width: 100%;
    height: 1px;
  }

  button {
    margin-top: 1rem;
  }
}
</style>
