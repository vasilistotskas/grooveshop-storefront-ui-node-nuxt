<script lang="ts" setup>
const { t } = useStoreI18n('components/Chat/Widget')
const { isMobile } = useDevice()

// Whether the assistant is on screen: shared with the conversation, so it
// survives a route change and anything that opens the assistant opens this
// one too.
const { open } = useShopChat()

// The drawer's runtime loads the first time the assistant opens.
const drawerMounted = useMountOnFirstOpen(open)

// Django's effective state for the store (agent commerce on AND the
// widget switched on). It rides the tenant payload, so it is known on
// the server too; the widget itself stays ClientOnly.
const chatEnabled = useStoreFeature('chatWidget')
</script>

<template>
  <div v-if="chatEnabled">
    <UButton
      :icon="open && !isMobile ? 'i-lucide-x' : 'i-lucide-sparkles'"
      size="xl"
      :aria-label="open ? t('chat.close') : t('chat.open')"
      :aria-expanded="open"
      class="
        fixed right-4 bottom-20 z-40 rounded-full bg-linear-to-br
        from-(--ui-secondary) to-(--ui-chat-gradient-to) p-3.5 text-white shadow-lg
        transition
        hover:shadow-xl
        motion-safe:hover:scale-105 motion-safe:active:scale-95
        md:bottom-6
      "
      @click="open = !open"
    />

    <!-- Phones get the native bottom-sheet pattern; the sheet carries the
         panel's own branded header, so the drawer chrome stays hidden. -->
    <LazyUDrawer
      v-if="isMobile && drawerMounted"
      v-model:open="open"
      :title="t('chat.title')"
      :description="t('chat.description')"
      :ui="{ content: 'max-h-[92dvh]', container: 'overflow-hidden p-0' }"
    >
      <template #content>
        <div class="h-[88dvh]">
          <LazyChatPanel @close="open = false" />
        </div>
      </template>
    </LazyUDrawer>

    <!-- Larger screens get a floating, non-modal assistant panel anchored
         to the launcher — the shopper keeps browsing while chatting. -->
    <Transition
      enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
      enter-from-class="translate-y-2 scale-95 opacity-0"
      leave-active-class="motion-safe:transition motion-safe:duration-150 motion-safe:ease-in"
      leave-to-class="translate-y-2 scale-95 opacity-0"
    >
      <div
        v-if="open && !isMobile"
        role="dialog"
        aria-modal="false"
        :aria-label="t('chat.title')"
        class="
          fixed right-4 bottom-36 z-50 flex w-[min(26rem,calc(100vw-2rem))]
          origin-bottom-right flex-col overflow-hidden rounded-3xl
          shadow-2xl ring ring-default
          md:bottom-24
        "
        :style="{ height: 'min(40rem, calc(100dvh - 11rem))' }"
        @keydown.esc="open = false"
      >
        <LazyChatPanel
          autofocus-prompt
          @close="open = false"
        />
      </div>
    </Transition>
  </div>
</template>

<i18n lang="yaml">
el:
  chat:
    open: Άνοιγμα βοηθού αγορών
    close: Κλείσιμο βοηθού αγορών
    title: Βοηθός αγορών
    description: Ρώτησέ με για προϊόντα, διαθεσιμότητα και την παραγγελία σου.
en:
  chat:
    open: Open the shopping assistant
    close: Close the shopping assistant
    title: Shopping assistant
    description: Ask me about products, availability and your order.
</i18n>
