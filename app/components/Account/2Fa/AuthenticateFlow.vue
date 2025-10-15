<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const router = useRouter()
const { t } = useI18n()
const authInfo = useAuthInfo()
const localePath = useLocalePath()
const localeRoute = useLocaleRoute()

const flow = computed(() => authInfo?.pendingFlow)
const next = router.currentRoute.value.query.next as string | undefined

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('index'))
}

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

const isCurrentPath = (path: FlowPathValue) => {
  const targetRoute = localeRoute(path)
  return targetRoute?.path === router.currentRoute.value.path
}

const filteredFlows = computed(() => {
  const currentPath = router.currentRoute.value.path
  if (!flow.value || !flow.value.types) return []
  return flow.value.types.map((type) => {
    return {
      label: labels[type],
      id: type,
      icon: icons[type],
      path: flow.value ? pathForFlow(flow.value, type) : 'index' as FlowPathValue,
    }
  })
    .filter(f => f.path !== currentPath)
})
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
          :disabled="isCurrentPath(f.path)"
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
