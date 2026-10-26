<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const { t } = useI18n()
const localePath = useLocalePath()

await usePendingFlowGuard(Flows.MFA_AUTHENTICATE)

const { next, alternatives } = useMfaAuthenticateMethods()

const labels = {
  [AuthenticatorType.TOTP]: t('mfa_reauthenticate.totp'),
  [AuthenticatorType.RECOVERY_CODES]: t('mfa_reauthenticate.recovery_codes'),
  [AuthenticatorType.WEBAUTHN]: t('mfa_reauthenticate.webauthn'),
}

const icons = {
  [AuthenticatorType.TOTP]: 'i-lucide-smartphone',
  [AuthenticatorType.RECOVERY_CODES]: 'i-lucide-life-buoy',
  [AuthenticatorType.WEBAUTHN]: 'i-lucide-key-round',
}

// The OTHER factors: the one in use is this page.
const filteredFlows = computed(() => alternatives.value.map(method => ({
  label: labels[method.type],
  id: method.type,
  icon: icons[method.type],
  path: method.path,
})))
</script>

<template>
  <div class="flex flex-col gap-6">
    <slot />
    <!-- The factors this account has other than the one on screen. -->
    <div
      v-if="filteredFlows.length"
      class="flex flex-col gap-2.5"
    >
      <USeparator :label="t('alternative_options')" />
      <UButton
        v-for="f in filteredFlows"
        :key="f.id"
        :label="f.label"
        :icon="f.icon"
        :to="localePath({
          name: f.path,
          query: { next },
        })"
        :variant="f.id === AuthenticatorType.WEBAUTHN ? 'outline' : 'ghost'"
        color="neutral"
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
    recovery_codes: Χρησιμοποίησε κωδικούς ανάκτησης
    webauthn: Χρησιμοποίησε κλειδί ασφαλείας ή passkey
en:
  alternative_options: other ways
  mfa_reauthenticate:
    totp: Use your authenticator app instead
    recovery_codes: Use a recovery code
    webauthn: Use a security key or passkey
</i18n>
