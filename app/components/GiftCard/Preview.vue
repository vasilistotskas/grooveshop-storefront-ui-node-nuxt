<script lang="ts" setup>
/**
 * The gift card as the recipient will see it: the store's wordmark on
 * the ink surface, who it is for and from, the amount, the message.
 * It redraws as the buyer fills the form, so the amount and the words
 * are never a surprise at the payment step.
 */
const props = defineProps<{
  amount?: number | null
  recipientName?: string
  senderName?: string
  message?: string
}>()

const { t } = useI18n()
const { $i18n } = useNuxtApp()

const recipient = computed(() => props.recipientName?.trim() ?? '')
const sender = computed(() => props.senderName?.trim() ?? '')

const addressLine = computed(() => {
  if (recipient.value && sender.value) {
    return t('for_from', { recipient: recipient.value, sender: sender.value })
  }
  if (recipient.value) return t('for', { recipient: recipient.value })
  if (sender.value) return t('from', { sender: sender.value })
  return ''
})
</script>

<template>
  <figure
    :aria-label="t('label')"
    class="
      relative flex min-h-64 flex-col justify-between overflow-hidden
      rounded-[1.25rem] bg-inverted p-6 text-inverted
      sm:min-h-80 sm:p-8
    "
  >
    <span
      class="absolute -top-16 -right-12 size-64 rounded-full bg-volt"
      aria-hidden="true"
    />
    <span
      class="absolute top-10 right-14 size-28 rounded-full bg-secondary"
      aria-hidden="true"
    />

    <!-- Positioned so it paints over the decorative circles: TenantLogo
         does not take a class on its root. -->
    <div class="relative">
      <TenantLogo
        inverted
        :width="132"
        :height="34"
      />
    </div>

    <figcaption class="relative flex flex-col gap-1">
      <p
        v-if="addressLine"
        class="text-sm opacity-80"
      >
        {{ addressLine }}
      </p>
      <p class="font-mono text-5xl font-bold tracking-tight">
        {{ $i18n.n(amount ?? 0, { key: 'currency', minimumFractionDigits: 0 }) }}
      </p>
      <p
        v-if="message?.trim()"
        class="mt-1 line-clamp-2 text-sm opacity-90"
      >
        “{{ message.trim() }}”
      </p>
    </figcaption>
  </figure>
</template>

<i18n lang="yaml">
el:
  label: Προεπισκόπηση δωροκάρτας
  for_from: "Για {recipient}, από {sender}"
  for: "Για {recipient}"
  from: "Από {sender}"
en:
  label: Gift card preview
  for_from: "For {recipient}, from {sender}"
  for: "For {recipient}"
  from: "From {sender}"
</i18n>
