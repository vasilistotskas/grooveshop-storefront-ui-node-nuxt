<script lang="ts" setup>
const { t } = useI18n()

const { messages, status, errorMessage, send, stop, reset } = useShopChat()

const input = ref('')
const scrollArea = ref<HTMLElement | null>(null)

const canSend = computed(
  () => input.value.trim().length > 0 && status.value !== 'streaming',
)

// The last assistant bubble is empty while the model thinks — show the
// typing indicator inside it instead of an empty bubble.
const isThinking = computed(() => {
  if (status.value !== 'streaming') return false
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' && last.text === ''
})

async function onSubmit() {
  if (!canSend.value) return
  const text = input.value
  input.value = ''
  await send(text)
}

function scrollToBottom() {
  const el = scrollArea.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

watch(
  () => [messages.value, status.value],
  async () => {
    await nextTick()
    scrollToBottom()
  },
  { deep: true },
)

onMounted(scrollToBottom)
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      ref="scrollArea"
      aria-live="polite"
      class="flex-1 space-y-3 overflow-y-auto p-4"
    >
      <div
        v-if="messages.length === 0"
        class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
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

      <template
        v-for="message in messages"
        :key="message.id"
      >
        <div
          v-if="message.role === 'user'"
          class="flex justify-end"
        >
          <div
            class="
              max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-3 py-2
              text-sm whitespace-pre-wrap text-white
            "
          >
            {{ message.text }}
          </div>
        </div>
        <div
          v-else-if="message.text !== '' || isThinking"
          class="flex justify-start"
        >
          <div
            class="
              max-w-[85%] rounded-2xl rounded-bl-sm bg-elevated px-3 py-2
              text-sm whitespace-pre-wrap text-default
            "
          >
            <span v-if="message.text !== ''">{{ message.text }}</span>
            <span
              v-else
              class="inline-flex items-center gap-1"
              :aria-label="t('chat.thinking')"
            >
              <span class="typing-dot" />
              <span class="typing-dot [animation-delay:150ms]" />
              <span class="typing-dot [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      </template>

      <UAlert
        v-if="status === 'error' && errorMessage"
        color="error"
        variant="soft"
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
    </div>

    <div class="border-t border-default p-3">
      <form
        class="flex items-end gap-2"
        @submit.prevent="onSubmit"
      >
        <UTextarea
          v-model="input"
          :placeholder="t('chat.placeholder')"
          :rows="1"
          autoresize
          :maxrows="5"
          :maxlength="2000"
          class="flex-1"
          @keydown.enter.exact.prevent="onSubmit"
        />
        <UButton
          v-if="status === 'streaming'"
          icon="i-lucide-square"
          color="neutral"
          variant="outline"
          :aria-label="t('chat.stop')"
          @click="stop"
        />
        <UButton
          v-else
          type="submit"
          icon="i-lucide-send-horizontal"
          color="secondary"
          :disabled="!canSend"
          :aria-label="t('chat.send')"
        />
      </form>
      <div class="mt-2 flex items-center justify-between gap-2">
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
    </div>
  </div>
</template>

<style scoped>
.typing-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background-color: currentColor;
  opacity: 0.4;
  animation: chat-typing 1s infinite ease-in-out;
}

@keyframes chat-typing {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dot {
    animation: none;
  }
}
</style>

<i18n lang="yaml">
el:
  chat:
    welcome:
      title: Γεια σου! Είμαι ο βοηθός αγορών.
      text: Ρώτησέ με για προϊόντα, διαθεσιμότητα, μεταφορικά ή την
        παραγγελία σου — και μπορώ να ετοιμάσω το καλάθι σου.
    placeholder: Ρώτησέ με για προϊόντα…
    send: Αποστολή
    stop: Διακοπή
    new: Νέα συνομιλία
    thinking: Ο βοηθός σκέφτεται…
    disclaimer: Ο βοηθός μπορεί να κάνει λάθη — έλεγξε το καλάθι πριν την
      παραγγελία.
</i18n>
