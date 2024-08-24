<script lang="ts" setup>
import { defu } from 'defu'

type SpinnerPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'

type Spinner = {
  enabled: boolean
  fontSize?: string
  icon?: string
  position?: SpinnerPosition
}

const defaultSpinner = {
  enabled: false,
  fontSize: 'text-3xl',
  icon: 'i-heroicons-arrow-path',
  position: 'center',
}

const props = withDefaults(
  defineProps<{
    width?: number | string
    height?: number | string
    borderRadius?: string
    showAnimation?: boolean
    text?: string
    textColor?: string
    spinner?: Spinner
    modal?: boolean
    count?: number
  }>(),
  {
    width: 'auto',
    height: 'auto',
    borderRadius: '5px',
    showAnimation: true,
    text: undefined,
    textColor: undefined,
    spinner: undefined,
    modal: false,
    count: 1,
  },
)

const spinnerWithDefaults = defu(props.spinner, defaultSpinner)

const spinnerPositionClass = computed(() => {
  switch (spinnerWithDefaults.position) {
    case 'top-left':
      return 'top-0 left-0'
    case 'top-right':
      return 'top-0 right-0'
    case 'bottom-left':
      return 'bottom-0 left-0'
    case 'bottom-right':
      return 'bottom-0 right-0'
    case 'center':
    default:
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  }
})

const GenericModal = resolveComponent('GenericModal')

const loadingPlaceholders = computed(() => {
  return Math.max(1, props.count > 0 ? props.count : 1)
})
</script>

<template>
  <div>
    <Component
      :is="modal ? GenericModal : 'div'"
      v-for="index in loadingPlaceholders"
      :key="index"
      :ref="modal ? 'fallbackModal' : undefined"
      :class="modal ? undefined : 'relative grid'"
      :unique-id="modal ? 'fallbackModal' : undefined"
      :should-modal-start-in-open-state="modal ? true : undefined"
      :has-header="modal ? false : undefined"
      :has-footer="modal ? false : undefined"
      :close-btn="modal ? false : undefined"
      :close-on-click-outside="modal ? false : undefined"
      :modal-open-trigger-handler-id="modal ? 'fallbackModalOpen' : undefined"
      :modal-close-trigger-handler-id="modal ? 'fallbackModalClose' : undefined"
    >
      <USkeleton
        class="grid"
        :style="{
          width: width,
          height: height,
          borderRadius: borderRadius,
        }"
        :ui="{
          background: showAnimation
            ? 'bg-primary-300 dark:bg-primary-600'
            : 'bg-transparent dark:bg-transparent',
        }"
      />
      <p
        v-if="text"
        class="
          text-primary-950 absolute left-1/2 top-1/2 grid -translate-x-1/2
          -translate-y-1/2 transform place-items-center font-semibold

          dark:text-primary-50
        "
        :style="{ color: textColor }"
        v-text="text"
      />
      <div v-if="spinnerWithDefaults.enabled" :class="['absolute', spinnerPositionClass]">
        <UIcon
          :name="spinnerWithDefaults.icon"
          class="animate-spin"
          :style="{ fontSize: spinnerWithDefaults.fontSize }"
          role="status"
          aria-live="polite"
          :aria-label="$t('common.loading')"
        />
      </div>
    </Component>
  </div>
</template>
