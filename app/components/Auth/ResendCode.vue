<script lang="ts" setup>
/**
 * "Didn't get it? Send the code again", for the pages that wait on an
 * emailed code.
 *
 * The countdown is the store's published cooldown
 * (`TenantConfig.codeResendCooldownSeconds`), started when the page opens
 * because a code has just been sent. A tenant that publishes none gets no
 * timer but keeps the action: Django is the one that refuses a resend, so
 * hiding the way to ask would only strand the shopper whose mail did not
 * arrive. A 429 asks them to wait; a 409 means there is no code left to
 * send, so they go back to the step that issues one.
 *
 * The button is never `disabled` (nor `loading`, which disables it): that
 * drops keyboard focus to the page the moment it is pressed. It is
 * `aria-disabled` and ignores the click instead, and a polite live region
 * says once, when the wait is over, that a new code can be asked for —
 * never on every tick.
 */
const props = defineProps<{
  /** Asks the API for the code again. */
  send: () => Promise<unknown>
  /** The step that issues a first code, for when nothing can be resent. */
  startOver: 'account-login-code' | 'account-signup'
}>()

const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const tenantStore = useTenantStore()

const cooldown = computed(() => tenantStore.codeResendCooldownSeconds ?? 0)
const ready = ref(false)
const { remaining, start } = useCountdown(cooldown, {
  onComplete: () => { ready.value = true },
})

const sending = ref(false)

const locked = computed(() => remaining.value > 0 || sending.value)

const timer = computed(() => {
  const minutes = Math.floor(remaining.value / 60)
  const seconds = String(remaining.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

/** Starts the wait again, for a code sent by something other than this button. */
function restart() {
  ready.value = false
  if (cooldown.value > 0) start()
}

async function onResend() {
  if (locked.value) return
  sending.value = true
  try {
    await props.send()
    toast.add({
      title: t('sent'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
    restart()
    emit('sent')
  }
  catch (error) {
    if (isConflictClientError(error)) {
      toast.add({ title: t('start_over'), color: 'warning' })
      await navigateTo(localePath(props.startOver))
      return
    }
    if (isRateLimitedClientError(error)) {
      toast.add({ title: t('wait'), color: 'warning' })
      restart()
      return
    }
    handleAllAuthClientError(error)
  }
  finally {
    sending.value = false
  }
}

onMounted(restart)

defineExpose({ restart })
</script>

<template>
  <div class="text-center text-sm text-muted">
    <p class="flex flex-wrap items-center justify-center gap-x-1">
      {{ t('no_code') }}
      <UButton
        :label="remaining > 0 ? t('resend_in', { time: timer }) : t('resend')"
        :icon="sending ? 'i-lucide-loader-circle' : undefined"
        :ui="{ leadingIcon: sending ? 'animate-spin' : '' }"
        :aria-disabled="locked"
        :aria-busy="sending"
        color="neutral"
        variant="link"
        size="sm"
        class="px-0 font-semibold text-accent"
        :class="{ 'cursor-not-allowed opacity-75': locked }"
        @click="onResend"
      />
    </p>
    <span
      role="status"
      class="sr-only"
    >
      {{ ready ? t('ready') : '' }}
    </span>
  </div>
</template>

<i18n lang="yaml">
el:
  no_code: Δεν τον έλαβες;
  resend: Στείλε τον ξανά
  resend_in: Νέα αποστολή σε {time}
  ready: Μπορείς να ζητήσεις νέο κωδικό.
  sent: Σου στείλαμε νέο κωδικό.
  wait: Περίμενε λίγο πριν ζητήσεις νέο κωδικό.
  start_over: Δεν μπορούμε να στείλουμε άλλον κωδικό. Ξεκίνα από την αρχή.
en:
  no_code: Didn't get it?
  resend: Send it again
  resend_in: Send again in {time}
  ready: You can ask for a new code now.
  sent: We sent you a new code.
  wait: Please wait a moment before asking for another code.
  start_over: We can't send another code. Please start over.
</i18n>
