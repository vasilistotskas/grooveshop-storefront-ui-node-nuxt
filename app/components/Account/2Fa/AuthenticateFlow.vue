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
  [AuthenticatorType.TOTP]: 'i-lucide-smartphone',
  [AuthenticatorType.RECOVERY_CODES]: 'i-lucide-life-buoy',
  [AuthenticatorType.WEBAUTHN]: 'i-lucide-key-round',
}

const isCurrentPath = (path: FlowPathValue) => {
  const targetRoute = localeRoute(path)
  return targetRoute?.path === router.currentRoute.value.path
}

// The OTHER factors: the one in use is this page.
const filteredFlows = computed(() => {
  if (!flow.value || !flow.value.types) return []
  const sortedTypes = [...flow.value.types].sort((a, b) => {
    const ai = AUTHENTICATOR_TYPE_PRIORITY.indexOf(a)
    const bi = AUTHENTICATOR_TYPE_PRIORITY.indexOf(b)
    return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
  })
  return sortedTypes.map((type) => {
    return {
      label: labels[type],
      id: type,
      icon: icons[type],
      path: flow.value ? pathForFlow(flow.value, type)! : 'index' as FlowPathValue,
    }
  })
    .filter(f => !isCurrentPath(f.path))
})
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
