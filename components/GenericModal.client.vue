<script lang="ts" setup>
import { GlobalEvents } from '~/events'

const props = defineProps({
  shouldModalStartInOpenState: {
    type: Boolean,
    required: false,
    default: false,
  },
  id: {
    type: String,
    required: false,
    default: 'generic-modal',
  },
  name: {
    type: String,
    required: false,
    default: 'generic-modal',
  },
  class: {
    type: String,
    required: false,
    default: 'generic-modal',
  },
  uniqueId: {
    type: String,
    required: true,
  },
  closeBtn: {
    type: Boolean,
    required: false,
    default: true,
  },
  closeBtnColor: {
    type: String,
    required: false,
    default: '#f87171',
  },
  closeBtnPosition: {
    type: String,
    required: false,
    default: 'out',
    validator: (value: string) => ['in', 'out'].includes(value),
  },
  hasHeader: {
    type: Boolean,
    required: false,
    default: true,
  },
  hasFooter: {
    type: Boolean,
    required: false,
    default: true,
  },
  openDispatchEvent: {
    type: String,
    required: false,
    default: 'modal-open',
  },
  closeDispatchEvent: {
    type: String,
    required: false,
    default: 'modal-close',
  },
  width: {
    type: String,
    required: false,
    default: '100%',
  },
  height: {
    type: String,
    required: false,
    default: '100%',
  },
  maxWidth: {
    type: String,
    required: false,
    default: '1190px',
  },
  maxHeight: {
    type: String,
    required: false,
    default: '680px',
  },
  overflow: {
    type: String,
    required: false,
    default: 'unset',
  },
  gap: {
    type: String,
    required: false,
    default: 'unset',
  },
  padding: {
    type: String,
    required: false,
    default: '1rem',
  },
  modalOpenTriggerHandlerId: {
    type: String,
    required: false,
    default: 'modal-open',
  },
  modalCloseTriggerHandlerId: {
    type: String,
    required: false,
    default: 'modal-close',
  },
  modalOpenedTriggerHandlerId: {
    type: String,
    required: false,
    default: 'modal-opened',
  },
  modalClosedTriggerHandlerId: {
    type: String,
    required: false,
    default: 'modal-closed',
  },
  exitModalIconClass: {
    type: String,
    required: false,
    default: 'lni lni-close',
  },
  position: {
    type: String,
    default: 'absolute',
  },
  backgroundBlur: {
    type: String,
    required: false,
    default: 'blur(1rem)',
  },
  borderRadius: {
    type: String,
    required: false,
    default: '10px',
  },
  border: {
    type: String,
    required: false,
    default: 'none',
  },
  isForm: {
    type: Boolean,
    required: false,
    default: false,
  },
  formId: {
    type: String,
    required: false,
    default: '',
  },
  formName: {
    type: String,
    required: false,
    default: '',
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true,
  },
})

defineSlots<{
  header(props: object): any
  default(props: object): any
  footer(props: object): any
}>()

defineEmits(['submit'])

const {
  class: className,
  shouldModalStartInOpenState,
  uniqueId,
  closeBtn,
  closeBtnColor,
  closeBtnPosition,
  hasHeader,
  hasFooter,
  width,
  height,
  maxWidth,
  maxHeight,
  overflow,
  gap,
  padding,
  modalOpenTriggerHandlerId,
  modalCloseTriggerHandlerId,
  modalOpenedTriggerHandlerId,
  modalClosedTriggerHandlerId,
  position,
  backgroundBlur,
  borderRadius,
  border,
  isForm,
  formId,
  formName,
  closeOnClickOutside,
} = toRefs(props)

const isModalCurrentlyOpen = ref(shouldModalStartInOpenState.value)
const getMyId = computed(() => `modal-${uniqueId.value}`)

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const openModal = () => {
  isModalCurrentlyOpen.value = true
  bus.emit(modalOpenedTriggerHandlerId.value)
}

const closeModal = () => {
  isModalCurrentlyOpen.value = false
  bus.emit(modalClosedTriggerHandlerId.value)
}

bus.on((event: string) => {
  if (event === modalOpenTriggerHandlerId.value) {
    openModal()
  }
  if (event === modalCloseTriggerHandlerId.value) {
    closeModal()
  }
})

const handleOverlayClick = () => {
  if (closeOnClickOutside.value) {
    closeModal()
  }
}

onMounted(() => {
  isModalCurrentlyOpen.value = shouldModalStartInOpenState.value
})
</script>

<template>
  <Teleport to="#teleports">
    <div
      :class="`cp-utilities-generic-modal-wrapper ${
        isModalCurrentlyOpen ? 'open' : 'closed'
      }`"
    >
      <div
        class="cp-utilities-generic-modal-overlay"
        :style="`backdrop-filter:${backgroundBlur};`"
        @click="handleOverlayClick"
      >
        <svg
          class="cp-utilities-generic-modal-overlay-static"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter :id="getMyId">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.68"
              numOctaves="1"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" :filter="`url(#${getMyId})`" />
        </svg>
      </div>
      <button
        v-if="closeBtn && closeBtnPosition === 'out'"
        :style="`color: ${closeBtnColor}`"
        class="cp-utilities-generic-modal-overlay-close"
        type="button"
        aria-label="Close"
        @click="closeModal"
      >
        <span class="sr-only">{{ $t('components.generic_modal.close') }}</span>
        <UIcon name="i-heroicons-x-circle" />
      </button>
      <template v-if="isForm">
        <form
          :id="formId"
          class="cp-utilities-generic-modal"
          :class="className"
          :name="formName"
          @submit="$emit('submit', $event)"
        >
          <div v-if="hasHeader" class="cp-utilities-generic-modal-header">
            <slot name="header" />
          </div>
          <div class="cp-utilities-generic-modal-body">
            <slot />
          </div>
          <div v-if="hasFooter" class="cp-utilities-generic-modal-footer">
            <slot name="footer" />
          </div>
          <button
            v-if="closeBtn && closeBtnPosition === 'in'"
            :style="`color: ${closeBtnColor}`"
            class="cp-utilities-generic-modal-overlay-close"
            type="button"
            aria-label="Close"
            @click="closeModal"
          >
            <span class="sr-only">{{
              $t('components.generic_modal.close')
            }}</span>
            <UIcon name="i-heroicons-x-circle" />
          </button>
        </form>
      </template>
      <template v-else>
        <div class="cp-utilities-generic-modal" :class="className">
          <div v-if="hasHeader" class="cp-utilities-generic-modal-header">
            <slot name="header" />
          </div>
          <div class="cp-utilities-generic-modal-body">
            <slot />
          </div>
          <div v-if="hasFooter" class="cp-utilities-generic-modal-footer">
            <slot name="footer" />
          </div>
          <button
            v-if="closeBtn && closeBtnPosition === 'in'"
            :style="`color: ${closeBtnColor}`"
            class="cp-utilities-generic-modal-overlay-close"
            type="button"
            aria-label="Close"
            @click="closeModal"
          >
            <span class="sr-only">{{
              $t('components.generic_modal.close')
            }}</span>
            <UIcon name="i-heroicons-x-circle" />
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
$transitional-profile-1: all 0.2s ease-out;

.cp-utilities-generic-modal {
  visibility: hidden;
  content-visibility: hidden;
  z-index: 32;
  position: v-bind(position);
  width: v-bind(width);
  height: v-bind(height);
  max-height: v-bind(maxHeight);
  max-width: v-bind(maxWidth);
  overflow: v-bind(overflow);
  gap: v-bind(gap);
  padding: v-bind(padding);

  &-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: $transitional-profile-1;
    pointer-events: none;
    user-select: none;
    display: grid;
    align-items: center;
    align-content: center;
    justify-items: center;
    justify-content: center;
    z-index: 31;

    &.open {
      opacity: 1;
      pointer-events: auto;
      user-select: initial;

      .cp-utilities-generic-modal {
        visibility: visible;
        content-visibility: visible;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 1rem;
        border: v-bind(border);
        border-radius: v-bind(borderRadius);

        @media screen and (width <= 1200px) {
          max-height: 100svh;
        }

        @media screen and (width <= 767px) {
          max-width: 100% !important;
          padding: 20px;
        }
      }
    }
  }

  &-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 1;
    z-index: 30;
    transition: $transitional-profile-1;

    @media screen and (width <= 767px) {
      width: 100svw;
      height: 100lvh;
    }

    &-static {
      width: 100%;
      height: 100%;
      opacity: 0.23;
    }

    &-close {
      border-radius: 20px;
      border: none;
      position: absolute;
      top: 1rem;
      right: 1rem;
      cursor: pointer;
      color: #ef1b1b;
      z-index: 33;
      transition: $transitional-profile-1;

      span {
        i {
          font-weight: 900;
        }
      }

      &:hover {
        transform: scale(1.5);
      }

      &:active {
        transform: scale(0.8);
      }
    }
  }

  &-body {
    display: grid;
    transition: all 0.5s ease;
  }

  &-header {
    position: relative;
  }
}
</style>
