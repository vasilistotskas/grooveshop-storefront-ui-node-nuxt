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
    class="
      fixed bottom-0 left-0 right-0 top-0 z-10 flex

      bg-black:90
    "
  >
    <button
      class="
        z-100 p3 n-link absolute right-1 top-1 rounded-full text-3xl

        bg-black:60
      "
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
      class="
        m5 w-full border-none

        lg:m20
      "
    />
  </div>
</template>
