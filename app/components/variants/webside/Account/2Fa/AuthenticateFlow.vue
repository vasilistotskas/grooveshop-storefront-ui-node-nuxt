<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const { t } = useStoreI18n('components/variants/webside/Account/2Fa/AuthenticateFlow')
const localePath = useLocalePath()

await usePendingFlowGuard(Flows.MFA_AUTHENTICATE)

const { flow, next, alternatives } = useMfaAuthenticateMethods()

const labels = {
  [AuthenticatorType.TOTP]: t('mfa_reauthenticate.totp'),
  [AuthenticatorType.RECOVERY_CODES]: t('mfa_reauthenticate.recovery_codes'),
  [AuthenticatorType.WEBAUTHN]: t('mfa_reauthenticate.webauthn'),
}

const icons = {
  [AuthenticatorType.TOTP]: 'i-heroicons-device-phone-mobile',
  [AuthenticatorType.RECOVERY_CODES]: 'i-heroicons-key',
  [AuthenticatorType.WEBAUTHN]: 'i-heroicons-finger-print',
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
  <div class="space-y-6">
    <div class="space-y-2 text-center">
      <h3 class="text-2xl font-bold text-highlighted">
        {{ t('2fa.title') }}
      </h3>
      <p class="text-sm text-muted">
        {{ t('2fa.subtitle') }}
      </p>
    </div>

    <slot />

    <div
      v-if="flow && flow.types && flow?.types?.length > 1"
      class="space-y-4"
    >
      <USeparator :label="t('alternative_options')" />

      <div class="grid gap-3">
        <UButton
          v-for="f in filteredFlows"
          :key="f.id"
          :label="f.label"
          :icon="f.icon"
          :to="localePath({
            name: f.path,
            query: { next },
          })"
          variant="outline"
          color="neutral"
          size="lg"
          block
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  alternative_options: Εναλλακτικές επιλογές
  2fa:
    title: Διπλή επαλήθευση
    subtitle: Ο λογαριασμός σου προστατεύεται από έλεγχο ταυτότητας δύο παραγόντων
  mfa_reauthenticate:
    totp: Χρησιμοποίησε την εφαρμογή πολλαπλών παραγόντων
    recovery_codes: Χρησιμοποίησε κωδικούς ανάκτησης
    webauthn: Χρησιμοποίησε το κλειδί ασφαλείας
</i18n>
