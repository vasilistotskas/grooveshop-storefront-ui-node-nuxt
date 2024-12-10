<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  flow: { type: String as PropType<Flow['id']>, required: false },
})

defineSlots<{
  default(props: object): any
}>()

const { flow } = toRefs(props)

const router = useRouter()
const { t } = useI18n()

const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')

const next = router.currentRoute.value.query.next as string | undefined

const flowLabels = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.title'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn'),
}

const flows = computed(() => {
  if (!authState.value) return []
  if ('data' in authState.value && 'flows' in authState.value.data) {
    return authState.value.data.flows || []
  }

  return []
})

function flowsToMethods(flows: Flow[]): { label: string, id: string, path: string }[] {
  const methods: { label: string, id: string, path: string }[] = []
  flows.forEach((flow) => {
    if (flow.id === Flows.MFA_REAUTHENTICATE) {
      flow.types?.forEach((typ) => {
        methods.push({
          label: flowLabels[`${flow.id}:${typ}`] || flow.id,
          id: flow.id,
          path: pathForFlow(flow, typ),
        })
      })
    }
    else {
      methods.push({
        label: flowLabels[flow.id] || flow.id,
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
const filteredMethods = computed(() => {
  return methods.value.filter(m => m.id !== flow?.value)
})
</script>

<template>
  <div
    class="
      grid gap-4

      md:gap-12
    "
  >
    <div class="grid items-center justify-center justify-items-center">
      <h3
        class="
          text-primary-950 text-2xl font-bold

          dark:text-primary-50
        "
      >
        {{ $t('confirm_access') }}
      </h3>
      <p>
        {{ $t('reauthenticate.title') }}
      </p>
    </div>

    <slot />

    <div
      v-if="methods.length > 1" class="grid items-center justify-center gap-2"
    >
      <p>{{ $t('alternative_options') }}</p>
      <ul class="grid items-center">
        <li
          v-for="f in filteredMethods"
          :key="f.id"
          class="grid items-center gap-2"
        >
          <UButton
            :label="f.label"
            :to="{
              path: f.path,
              query: { next },
            }"
            class="p-0"
            color="primary"
            icon="i-heroicons-arrow-right"
            size="xl"
            type="button"
            variant="ghost"
          />
        </li>
      </ul>
    </div>
  </div>
</template>
