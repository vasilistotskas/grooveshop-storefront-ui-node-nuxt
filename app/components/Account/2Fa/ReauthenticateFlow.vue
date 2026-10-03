<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  flow: { type: String as PropType<Flow['id']>, required: false },
})

defineSlots<{
  default(props: object): any
}>()

const { $routeBaseName } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const localePath = useLocalePath()

const routeName = computed(() => $routeBaseName(route))

const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')

const next = router.currentRoute.value.query.next as string | undefined

const flowIcons = {
  [Flows.REAUTHENTICATE]: 'i-lucide-lock-keyhole',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'i-lucide-smartphone',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'i-lucide-life-buoy',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'i-lucide-key-round',
}

const flowLabels = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.title'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn'),
}

const flows = computed(() => {
  if (!authState.value)
    return []
  if ('data' in authState.value && 'flows' in authState.value.data) {
    return authState.value.data.flows || []
  }

  return []
})

function flowsToMethods(flows: Flow[]) {
  const methods: { label: string, icon: string, id: Flow['id'], path: FlowPathValue }[] = []
  flows.forEach((flow) => {
    if (flow.id === Flows.MFA_REAUTHENTICATE) {
      const sortedTypes = [...(flow.types ?? [])].sort((a, b) => {
        const ai = AUTHENTICATOR_TYPE_PRIORITY.indexOf(a)
        const bi = AUTHENTICATOR_TYPE_PRIORITY.indexOf(b)
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
      })
      sortedTypes.forEach((typ) => {
        const key = `${flow.id}:${typ}`
        methods.push({
          label: flowLabels[key] || flow.id,
          icon: flowIcons[key] || 'i-heroicons-shield-check',
          id: flow.id,
          path: pathForFlow(flow, typ)!,
        })
      })
    }
    else {
      methods.push({
        label: flowLabels[flow.id] || flow.id,
        icon: flowIcons[flow.id] || 'i-heroicons-shield-check',
        id: flow.id,
        path: pathForFlow(flow)!,
      })
    }
  })
  return methods
}

const methods = computed(() => {
  return flowsToMethods(flows.value)
})
const otherMethods = computed(() => methods.value.filter(method => method.path !== routeName.value))
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
