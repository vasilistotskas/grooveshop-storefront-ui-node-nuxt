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

// Computed — use the prop directly (more testable; SelectedBoxNowLocker
// passes config.public.boxnowPartnerId as partnerId already). Returns
// empty string when partnerId is missing so the iframe doesn't render
// instead of throwing — StepShipping already disables the radio in that
// state, but defence-in-depth keeps the picker from crashing the form.
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
}

function onClose() {
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
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!loading"
    :ui="{
      content: 'h-screen max-w-4xl',
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
        <iframe
          v-if="iframeUrl"
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
</i18n>
