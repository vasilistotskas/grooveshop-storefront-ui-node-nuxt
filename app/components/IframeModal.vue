<script lang="ts" setup>
// Delegates focus-trap, body scroll-lock, ESC-to-close and click-outside
// dismissal to UModal (Reka UI Dialog under the hood) — all the a11y
// plumbing the previous hand-rolled overlay was missing.

const open = ref(false)
const src = ref<string | null>(null)

function showModal(link: string) {
  src.value = link
  open.value = true
}

function handleOpenUpdate(value: boolean) {
  open.value = value
  if (!value) {
    src.value = null
  }
}

provideIframeModal(showModal)
</script>

<template>
  <UModal
    :open="open"
    fullscreen
    :ui="{
      content: 'bg-transparent shadow-none ring-0',
      body: 'flex items-center justify-center p-0',
      close: 'inset-e-2 top-2 z-60',
    }"
    @update:open="handleOpenUpdate"
  >
    <template #body>
      <iframe
        v-if="src"
        allow="autoplay; encrypted-media"
        allowfullscreen
        :src="src"
        class="h-full w-full border-none"
      />
    </template>
  </UModal>
</template>
