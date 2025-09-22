<script lang="ts" setup>
import type { PropType } from 'vue'

const getCursorFromUrl = (url: string): string => {
  try {
    const params = new URLSearchParams(url.split('?')[1])
    return params.get('cursor') || ''
  }
  catch (error) {
    console.error('Invalid URL for cursor extraction:', url, error)
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
    required: false,
    default: 1,
  },
})

const { cursorKey, links, loading, useRouteQuery, strategy, totalPages } = toRefs(props)

const router = useRouter()
const route = useRoute()
const { $i18n } = useNuxtApp()

const cursorState = useState<CursorState>('cursor-state')

const currentState = computed(() => ({ ...cursorState.value }))
const currentCursor = computed(() => currentState.value[cursorKey.value])

const nextCursor = computed(() => {
  if (!links.value?.next) {
    return ''
  }
  const cursor = getCursorFromUrl(links.value.next)
  return cursor
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

const shouldShowTrigger = computed(() => {
  return strategy.value === 'scroll' && hasMore.value
})

const infiniteScrollTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const isLoadingMore = ref(false)

const loadMore = async () => {
  if (!nextCursor.value || loading.value || isLoadingMore.value) {
    return
  }

  if (nextCursor.value !== currentCursor.value) {
    isLoadingMore.value = true

    try {
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
    catch (error) {
      console.error('❌ Error in loadMore:', error)
    }
    finally {
      setTimeout(() => {
        isLoadingMore.value = false
      }, 500)
    }
  }
}

const createObserver = () => {
  if (strategy.value !== 'scroll' || !infiniteScrollTrigger.value || !hasMore.value) {
    return
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore.value && !isLoadingMore.value) {
            loadMore()
          }
        })
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
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

let resizeTimeout: NodeJS.Timeout | null = null
const debouncedHandleResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(() => {
    handleResize()
    resizeTimeout = null
  }, 300)
}

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

watch(
  () => hasMore.value,
  (newHasMore) => {
    if (strategy.value === 'scroll') {
      destroyObserver()
      if (newHasMore) {
        createObserver()
      }
    }
  },
)

watch(
  () => infiniteScrollTrigger.value,
  (newTrigger) => {
    if (newTrigger && strategy.value === 'scroll' && hasMore.value) {
      createObserver()
    }
  },
)

onUnmounted(() => {
  destroyObserver()
  window.removeEventListener('resize', debouncedHandleResize)
  clearCursorState()
})
</script>

<template>
  <div class="cursor-pagination my-4 flex flex-col items-center">
    <div
      v-if="shouldShowTrigger"
      ref="infiniteScrollTrigger"
      class="h-[20px] w-full"
    />
    <UButton
      v-if="showLoadMoreButton"
      size="md"
      variant="soft"
      :label="$i18n.t('load.more')"
      color="neutral"
      aria-label="Load more posts"
      :loading="loading"
      class="mt-4"
      @click="loadMore"
    />
  </div>
</template>
