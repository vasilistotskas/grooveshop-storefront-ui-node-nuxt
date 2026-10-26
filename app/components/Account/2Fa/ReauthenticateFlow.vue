<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  flow: { type: String as PropType<Flow['id']>, required: false },
})

defineSlots<{
  default(props: object): any
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const { next, others } = useMfaReauthenticationMethods()

const flowIcons: Record<string, string> = {
  [Flows.REAUTHENTICATE]: 'i-lucide-lock-keyhole',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'i-lucide-smartphone',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'i-lucide-life-buoy',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'i-lucide-key-round',
}

const flowLabels: Record<string, string> = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.title'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn'),
}

const otherMethods = computed(() => others.value.map(method => ({
  ...method,
  label: flowLabels[method.key] || method.id,
  icon: flowIcons[method.key] || 'i-heroicons-shield-check',
})))
</script>

<template>
  <div class="flex flex-col gap-6">
    <slot />
    <!-- The other ways this account can confirm it is the shopper; the
         page on screen is one of them and is left out. -->
    <div
      v-if="otherMethods.length"
      class="flex flex-col gap-2.5"
    >
      <USeparator :label="t('alternative_options')" />
      <UButton
        v-for="method in otherMethods"
        :key="method.path"
        :label="method.label"
        :icon="method.icon"
        :to="localePath({
          name: method.path,
          query: { next },
        })"
        color="neutral"
        variant="ghost"
        block
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  alternative_options: άλλοι τρόποι
  mfa_reauthenticate:
    totp: Χρησιμοποίησε την εφαρμογή επαλήθευσης
    recovery_codes: Χρησιμοποίησε κωδικό ανάκτησης
    webauthn: Χρησιμοποίησε passkey ή κλειδί ασφαλείας
  reauthenticate:
    title: Χρησιμοποίησε τον κωδικό σου
en:
  alternative_options: other ways
  mfa_reauthenticate:
    totp: Use your authenticator app
    recovery_codes: Use a recovery code
    webauthn: Use a passkey instead
  reauthenticate:
    title: Use your password
</i18n>
