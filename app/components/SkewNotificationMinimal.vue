<script setup lang="ts">
import { reloadNuxtApp } from '#app'
import { useSkewProtection } from '#imports'
import { ref, onMounted } from 'vue'

const skew = useSkewProtection()
const isVisible = ref(false)

onMounted(() => {
  skew.onCurrentChunksOutdated(() => {
    isVisible.value = true
  })
})

function dismiss() {
  isVisible.value = false
}

async function reload() {
  reloadNuxtApp({
    force: true,
    persistState: false,
  })
}
</script>

<template>
  test: {{ skew }}
  <Transition name="slide-up">
    <div
      v-if="isVisible"
      class="fixed right-6 bottom-6 z-[9999] max-w-sm"
    >
      <div
        class="
          flex items-center gap-3 rounded-full border border-gray-200 bg-white
          px-4 py-3 shadow-lg
          dark:border-gray-800 dark:bg-gray-900
        "
      >
        <span class="text-lg">🚨</span>
        <span
          class="
            text-sm font-medium text-gray-900
            dark:text-white
          "
        >
          Update available
        </span>
        <div class="ml-auto flex gap-2">
          <button
            class="
              rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700
              transition-colors
              hover:bg-gray-200
              dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            "
            @click="dismiss"
          >
            Dismiss
          </button>
          <button
            class="
              rounded-full bg-primary-600 px-3 py-1.5 text-xs text-white
              transition-colors
              hover:bg-primary-700
            "
            @click="reload"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(1rem);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
