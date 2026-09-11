<script lang="ts" setup>
// Props & emits
const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  partnerId: string
}>()

const emit = defineEmits<{
  selected: [locker: BoxNowSelectedLocker]
  close: []
}>()

// Composables
const { t } = useI18n()

// State
const loading = ref(true)
// The skeleton is opaque and covers the iframe, and only the iframe's
// own ``load`` event clears it — so a widget that never loads leaves
// the shopper on a "loading" panel forever with nothing to act on,
// which is indistinguishable from the lockers simply not appearing.
// After this long, say so and offer a retry.
const IFRAME_LOAD_TIMEOUT_MS = 15000
const timedOut = ref(false)
// Bumped to re-mount the iframe on retry — reassigning the same ``src``
// does not reload a frame that failed.
const attempt = ref(0)
let loadTimer: ReturnType<typeof setTimeout> | null = null

function stopTimer() {
  if (loadTimer) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
}

function startTimer() {
  stopTimer()
  loadTimer = setTimeout(() => {
    if (loading.value) {
      loading.value = false
      timedOut.value = true
    }
  }, IFRAME_LOAD_TIMEOUT_MS)
}

function retry() {
  timedOut.value = false
  loading.value = true
  attempt.value += 1
  startTimer()
}

onBeforeUnmount(stopTimer)

// Computed — use the prop directly (more testable; checkout/index.vue
// passes tenantStore.boxNowPartnerId as partnerId already, tenant-only,
// no platform fallback). Returns empty string when partnerId is missing
// so the iframe doesn't render instead of throwing — StepShipping
// already disables the radio in that state, but defence-in-depth keeps
// the picker from crashing the form.
const iframeUrl = computed(() => {
  if (!props.partnerId) return ''
  return buildBoxNowIframeUrl({
    partnerId: props.partnerId,
    language: 'el',
    type: 'iframe',
    gps: true,
    autoselect: true,
    autoclose: false,
  })
})

// Methods
function onIframeLoad() {
  loading.value = false
  timedOut.value = false
  stopTimer()
}

function onClose() {
  stopTimer()
  open.value = false
  emit('close')
}

// postMessage handler — SSR-safe via useEventListener (VueUse)
useEventListener(
  import.meta.client ? window : null,
  'message',
  (event: MessageEvent) => {
    if (!isBoxNowAllowedOrigin(event.origin)) return

    const locker = parseBoxNowSelectedLocker(event.data)
    if (locker === null) return

    emit('selected', locker)
    open.value = false
  },
)

// Reset loading state each time the modal opens so the skeleton shows
watch(open, (val) => {
  if (val) {
    loading.value = true
    timedOut.value = false
    startTimer()
    return
  }
  stopTimer()
// ``immediate``: the watcher alone only arms the timer when ``open``
// CHANGES, so a picker mounted already open — a restored step, a test
// — would wait on a load event that may never come, with no timeout.
}, { immediate: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!loading"
    :ui="{
      // ``dvh``, not ``h-screen``/100vh: on mobile 100vh is the
      // viewport with the browser chrome HIDDEN, so a modal sized to
      // it is taller than the visible area and its body — the map
      // iframe — is pushed under the toolbar. Same unit the chat
      // widget and the product image modal already use.
      content: 'h-dvh max-w-4xl',
      body: 'min-h-0 flex-1 overflow-hidden p-0',
    }"
  >
    <template #header>
      <div class="flex w-full items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ t('shipping.boxnow.modal_title') }}
        </h2>
        <UButton
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="sm"
          :aria-label="t('close')"
          @click="onClose"
        />
      </div>
    </template>

    <template #body>
      <div class="relative size-full">
        <!-- Loading skeleton while iframe is loading -->
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-neutral-900"
        >
          <USkeleton class="h-full w-full" />
          <p class="absolute text-sm text-neutral-700 dark:text-neutral-200">
            {{ t('shipping.boxnow.iframe_loading') }}
          </p>
        </div>

        <!-- BoxNow widget iframe — only render when ``iframeUrl``
             resolves to a real URL. ``src=""`` triggers a same-origin
             navigation back to the checkout page (and would also
             fire ``@load``, hiding the skeleton prematurely). -->
        <!-- The widget never loaded. Say so and offer a way out —
             without this the shopper sits on an opaque skeleton with
             no error, which reads as "the lockers don't load". -->
        <div
          v-if="timedOut"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-default p-6 text-center"
        >
          <UIcon name="i-heroicons-exclamation-triangle" class="size-8 text-warning" />
          <p class="text-sm text-muted">
            {{ t('load_failed') }}
          </p>
          <UButton
            color="secondary"
            icon="i-heroicons-arrow-path"
            @click="retry"
          >
            {{ t('retry') }}
          </UButton>
        </div>

        <iframe
          v-if="iframeUrl"
          :key="attempt"
          :src="iframeUrl"
          allow="geolocation"
          class="size-full border-0"
          :title="t('shipping.boxnow.modal_title')"
          @load="onIframeLoad"
        />
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  close: Κλείσιμο
  load_failed: Ο χάρτης των lockers δεν φόρτωσε. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.
  retry: Δοκίμασε ξανά
</i18n>
