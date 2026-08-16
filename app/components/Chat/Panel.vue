<script lang="ts" setup>
withDefaults(defineProps<{ autofocusPrompt?: boolean }>(), {
  autofocusPrompt: false,
})

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const localePath = useLocalePath()

const { messages, status, errorMessage, cartMutated, send, stop, reset }
  = useShopChat()

const input = ref('')

// The suggestion labels double as the prompts they send — what the
// shopper reads is exactly what the assistant receives.
const suggestions = computed(() => [
  { icon: 'i-lucide-flame', label: t('chat.suggestions.trending') },
  { icon: 'i-lucide-gift', label: t('chat.suggestions.gift') },
  { icon: 'i-lucide-truck', label: t('chat.suggestions.shipping') },
  { icon: 'i-lucide-package-search', label: t('chat.suggestions.track') },
])

// The last assistant bubble is empty while the model thinks — presenting
// that phase as `submitted` lets UChatMessages show its typing indicator
// instead of an empty bubble (the empty message is filtered out below).
const isThinking = computed(() => {
  if (status.value !== 'streaming') return false
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' && last.text === ''
})

// UChatMessages consumes the Vercel-AI UIMessage shape ({id, role,
// parts}); our transport-agnostic ShopChatMessage maps onto text parts.
const uiMessages = computed(() =>
  messages.value
    .filter(m => m.text !== '')
    .map(m => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.text }],
    })),
)

const uiStatus = computed(() => {
  if (status.value === 'streaming') {
    return isThinking.value ? 'submitted' : 'streaming'
  }
  return status.value
})

function onSubmit() {
  const text = input.value.trim()
  if (!text || status.value === 'streaming') return
  input.value = ''
  send(text)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-default">
    <div
      class="
        flex shrink-0 items-center gap-3 bg-linear-to-br
        from-(--ui-secondary) to-violet-600 px-4 py-3
      "
    >
      <div class="relative">
        <div
          class="
            flex size-9 items-center justify-center rounded-full bg-white/15
          "
        >
          <UIcon
            name="i-lucide-sparkles"
            class="size-5 text-white"
          />
        </div>
        <span
          class="
            absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-400
            ring-2 ring-white/60
          "
          aria-hidden="true"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-white">
          {{ t('chat.title') }}
        </p>
        <p class="truncate text-xs text-white/70">
          {{ t('chat.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="messages.length > 0 && status !== 'streaming'"
        icon="i-lucide-rotate-ccw"
        variant="ghost"
        size="sm"
        class="text-white hover:bg-white/15"
        :aria-label="t('chat.new')"
        @click="reset"
      />
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="sm"
        class="text-white hover:bg-white/15"
        :aria-label="t('chat.close')"
        @click="emit('close')"
      />
    </div>

    <UChatPalette class="min-h-0 flex-1">
      <div
        v-if="uiMessages.length === 0 && uiStatus === 'ready'"
        class="
          flex h-full flex-col items-center justify-center gap-4 px-5
          text-center
        "
      >
        <div
          class="
            flex size-12 items-center justify-center rounded-2xl
            bg-linear-to-br from-(--ui-secondary) to-violet-600 shadow-lg
          "
        >
          <UIcon
            name="i-lucide-sparkles"
            class="size-6 text-white"
          />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-default">
            {{ t('chat.welcome.title') }}
          </p>
          <p class="text-xs text-muted">
            {{ t('chat.welcome.text') }}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <UButton
            v-for="suggestion in suggestions"
            :key="suggestion.label"
            :icon="suggestion.icon"
            :label="suggestion.label"
            color="neutral"
            variant="outline"
            size="xs"
            class="rounded-full"
            @click="send(suggestion.label)"
          />
        </div>
      </div>
      <UChatMessages
        v-else
        :messages="uiMessages"
        :status="uiStatus"
        should-auto-scroll
        :user="{
          side: 'right',
          variant: 'soft',
          ui: {
            content: `
              rounded-2xl rounded-br-sm bg-secondary/15 text-default
            `,
          },
        }"
        :assistant="{
          side: 'left',
          variant: 'naked',
          icon: 'i-lucide-sparkles',
          ui: { leadingIcon: 'text-secondary' },
        }"
      />

      <UAlert
        v-if="status === 'error' && errorMessage"
        color="error"
        variant="soft"
        class="mx-3 mb-2 w-auto"
        :description="errorMessage"
        :actions="[
          {
            label: t('chat.new'),
            color: 'neutral',
            variant: 'outline',
            size: 'xs',
            onClick: () => reset(),
          },
        ]"
      />

      <div
        v-if="cartMutated && status === 'ready'"
        class="
          mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl
          bg-success/10 px-3 py-2
        "
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            name="i-lucide-check-circle"
            class="size-4 shrink-0 text-success"
          />
          <p class="truncate text-xs text-default">
            {{ t('chat.cartUpdated') }}
          </p>
        </div>
        <UButton
          :label="t('chat.viewCart')"
          color="success"
          variant="soft"
          size="xs"
          :to="localePath('cart')"
          @click="emit('close')"
        />
      </div>

      <template #prompt>
        <UChatPrompt
          v-model="input"
          variant="soft"
          :autofocus="autofocusPrompt"
          :placeholder="t('chat.placeholder')"
          :maxrows="5"
          :maxlength="2000"
          @submit="onSubmit"
        >
          <UChatPromptSubmit
            :status="uiStatus"
            color="secondary"
            @stop="stop"
          />
          <template #footer>
            <div class="flex w-full items-center justify-between gap-2">
              <p class="text-[11px] text-muted">
                {{ t('chat.disclaimer') }}
              </p>
              <UButton
                v-if="messages.length > 0 && status !== 'streaming'"
                :label="t('chat.new')"
                color="neutral"
                variant="link"
                size="xs"
                @click="reset"
              />
            </div>
          </template>
        </UChatPrompt>
      </template>
    </UChatPalette>
  </div>
</template>

<i18n lang="yaml">
el:
  chat:
    title: Βοηθός αγορών
    subtitle: AI βοηθός · απαντά άμεσα
    close: Κλείσιμο βοηθού
    welcome:
      title: Γεια σου! Είμαι ο βοηθός αγορών.
      text: Ρώτησέ με για προϊόντα, διαθεσιμότητα, μεταφορικά ή την
        παραγγελία σου — και μπορώ να ετοιμάσω το καλάθι σου.
    suggestions:
      trending: Τι είναι δημοφιλές τώρα;
      gift: Ψάχνω ιδέες για δώρο
      shipping: Πόσο κοστίζουν τα μεταφορικά;
      track: Πού είναι η παραγγελία μου;
    cartUpdated: Το καλάθι σου ενημερώθηκε.
    viewCart: Δες το καλάθι
    placeholder: Ρώτησέ με για προϊόντα…
    new: Νέα συνομιλία
    disclaimer: Ο βοηθός μπορεί να κάνει λάθη — έλεγξε το καλάθι πριν την
      παραγγελία.
</i18n>
