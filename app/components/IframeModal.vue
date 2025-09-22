<script lang="ts" setup>
import { onKeyDown } from '@vueuse/core'

const src = ref<string | null>(null)

function showModal(link: string) {
  src.value = link
}
const el = ref<HTMLIFrameElement>()

provideIframeModal(showModal)

onKeyDown('Escape', () => {
  if (src.value) src.value = null
})

onClickOutside(el, () => {
  src.value = null
})
</script>

<template>
  <div
    v-if="src"
    class="fixed inset-0 z-10 flex"
  >
    <button
      class="absolute top-1 right-1 z-100 rounded-full text-3xl"
      title="Close"
      @click="src = null"
    >
      <UIcon name="i-fa6-solid-circle-xmark" />
    </button>
    <iframe
      ref="el"
      allow="autoplay; encrypted-media"
      allowfullscreen
      :src="src"
      class="w-full border-none"
    />
  </div>
</template>
