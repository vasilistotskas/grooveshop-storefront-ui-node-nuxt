<script lang="ts" setup>
const { t } = useI18n()

const { messages, status, errorMessage, send, stop, reset } = useShopChat()

const input = ref('')

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
  <UChatPalette class="h-full">
    <div
      v-if="uiMessages.length === 0 && uiStatus === 'ready'"
      class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <UIcon
        name="i-lucide-shopping-bag"
        class="size-8 text-muted"
      />
      <p class="text-sm font-medium text-default">
        {{ t('chat.welcome.title') }}
      </p>
      <p class="text-xs text-muted">
        {{ t('chat.welcome.text') }}
      </p>
    </div>
    <UChatMessages
      v-else
      :messages="uiMessages"
      :status="uiStatus"
      should-auto-scroll
      :user="{ side: 'right', variant: 'soft' }"
      :assistant="{ side: 'left', variant: 'naked' }"
    />

    <UAlert
      v-if="status === 'error' && errorMessage"
      color="error"
      variant="soft"
      class="mx-3 mb-2"
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

    <template #prompt>
      <UChatPrompt
        v-model="input"
        variant="soft"
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
</template>

<i18n lang="yaml">
el:
  chat:
    welcome:
      title: Γεια σου! Είμαι ο βοηθός αγορών.
      text: Ρώτησέ με για προϊόντα, διαθεσιμότητα, μεταφορικά ή την
        παραγγελία σου — και μπορώ να ετοιμάσω το καλάθι σου.
    placeholder: Ρώτησέ με για προϊόντα…
    new: Νέα συνομιλία
    disclaimer: Ο βοηθός μπορεί να κάνει λάθη — έλεγξε το καλάθι πριν την
      παραγγελία.
</i18n>
