<script lang="ts" setup>
/**
 * The shopping assistant's frame: an ink launcher, and on opening a
 * 420 x 640 panel over a scrim on a wide screen or a bottom drawer on
 * a phone. The conversation itself is `Chrome/AssistantPanel.vue`; its
 * state, and whether it is open, is `useShopChat`.
 */
const { t } = useStoreI18n('components/Chrome/Assistant')
const { isMobile } = useDevice()
const { open } = useShopChat()

// The drawer's and the modal's runtime load the first time it opens.
const overlayMounted = useMountOnFirstOpen(open)

// Django's effective state for the store (agent commerce on AND the
// widget switched on). It rides the tenant payload, so it is known on
// the server too; the assistant itself stays ClientOnly.
const chatEnabled = useStoreFeature('chatWidget')
</script>

<template>
  <div v-if="chatEnabled">
    <UButton
      color="neutral"
      class="
        fixed right-4
        bottom-[calc(var(--dock-base)+var(--dock-tabbar)+var(--dock-bar)+var(--dock-fab))]
        z-40 size-14 justify-center rounded-full bg-inverted
        text-(--ui-volt-on-inverted) shadow-lg transition
        hover:bg-inverted
        motion-safe:hover:scale-105 motion-safe:active:scale-95
        md:right-6
      "
      :icon="open ? 'i-lucide-x' : 'i-lucide-zap'"
      :ui="{ leadingIcon: 'size-6' }"
      :aria-label="open ? t('close') : t('open')"
      :aria-expanded="open"
      @click="() => { open = !open }"
    />

    <!-- Phones get the native bottom-sheet pattern; the panel carries its
         own header, so the drawer chrome stays hidden. -->
    <LazyUDrawer
      v-if="isMobile && overlayMounted"
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :ui="{ content: 'max-h-[92dvh]', container: 'overflow-hidden p-0' }"
    >
      <template #content>
        <div class="h-[88dvh]">
          <LazyChromeAssistantPanel @close="() => { open = false }" />
        </div>
      </template>
    </LazyUDrawer>

    <!-- Larger screens: a panel in the bottom-right corner over a scrim.
         A modal, so focus stays inside, Escape and a click on the scrim
         close it. -->
    <LazyUModal
      v-else-if="overlayMounted"
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :ui="{
        overlay: 'bg-inverted/50',
        content: `
          top-auto right-8 bottom-8 left-auto h-[min(40rem,calc(100dvh-4rem))]
          w-105 max-w-none translate-0 overflow-hidden rounded-[1.5rem]
          shadow-2xl
        `,
      }"
    >
      <template #content>
        <LazyChromeAssistantPanel
          autofocus-prompt
          @close="() => { open = false }"
        />
      </template>
    </LazyUModal>
  </div>
</template>

<i18n lang="yaml">
el:
  open: Άνοιγμα βοηθού αγορών
  close: Κλείσιμο βοηθού αγορών
  title: Βοηθός αγορών
  description: Ρώτησέ με για προϊόντα, διαθεσιμότητα και την παραγγελία σου.
en:
  open: Open the shopping assistant
  close: Close the shopping assistant
  title: Shopping assistant
  description: Ask me about products, availability and your order.
</i18n>
