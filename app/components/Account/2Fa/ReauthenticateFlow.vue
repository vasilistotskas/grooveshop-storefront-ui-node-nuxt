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
  [Flows.REAUTHENTICATE]: 'i-lucide-lock',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'i-lucide-smartphone',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'i-lucide-key-round',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'i-lucide-fingerprint',
}

const flowLabels = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.title'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn'),
}

const flowDescriptions = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp_description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes_description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn_description'),
}

const flowIconColors = {
  [Flows.REAUTHENTICATE]: 'text-info',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'text-info',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'text-info',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'text-info',
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
  const methods: { label: string, description: string, icon: string, iconColor: string, id: Flow['id'], path: FlowPathValue }[] = []
  flows.forEach((flow) => {
    if (flow.id === Flows.MFA_REAUTHENTICATE) {
      flow.types?.forEach((typ) => {
        const key = `${flow.id}:${typ}`
        methods.push({
          label: flowLabels[key] || flow.id,
          description: flowDescriptions[key] || '',
          icon: flowIcons[key] || 'i-lucide-shield',
          iconColor: flowIconColors[key] || 'primary',
          id: flow.id,
          path: pathForFlow(flow, typ),
        })
      })
    }
    else {
      methods.push({
        label: flowLabels[flow.id] || flow.id,
        description: flowDescriptions[flow.id] || '',
        icon: flowIcons[flow.id] || 'i-lucide-shield',
        iconColor: flowIconColors[flow.id] || 'primary',
        id: flow.id,
        path: pathForFlow(flow),
      })
    }
  })
  return methods
}

const methods = computed(() => {
  return flowsToMethods(flows.value)
})

const currentMethod = computed(() => {
  return methods.value.find((m) => {
    return m.path === routeName.value
  })
})
</script>

<template>
  <div class="space-y-6">
    <slot />

    <div v-if="methods.length > 0" class="space-y-4">
      <USeparator :label="t('alternative_options')" />

      <div class="space-y-2">
        <ULink
          v-for="method in methods"
          :key="method.id"
          :to="localePath({
            name: method.path,
            query: { next },
          })"
          class="
            flex items-center gap-3 rounded-lg border border-default p-4
            transition-colors
            hover:bg-elevated
          "
        >
          <div
            class="
              flex size-10 shrink-0 items-center justify-center rounded-full
              bg-primary/10
            "
          >
            <UIcon
              :name="method.icon"
              :class="method.iconColor"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-default">
              {{ method.label }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ method.description }}
            </p>
          </div>

          <UIcon
            name="i-lucide-chevron-right"
            class="size-5 shrink-0 text-muted"
          />
        </ULink>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  alternative_options: Εναλλακτικές μέθοδοι
  mfa_reauthenticate:
    totp: Εφαρμογή επαλήθευσης
    totp_description: Χρησιμοποιήστε τον 6ψήφιο κωδικό από την εφαρμογή σας
    recovery_codes: Κωδικοί ανάκτησης
    recovery_codes_description: Χρησιμοποιήστε έναν εφεδρικό κωδικό ανάκτησης
    webauthn: Κλειδί ασφαλείας
    webauthn_description: Χρησιμοποιήστε το κλειδί ασφαλείας ή βιομετρικά στοιχεία
  reauthenticate:
    title: Κωδικός πρόσβασης
    description: Επιβεβαιώστε την ταυτότητά σας με τον κωδικό σας
</i18n>
