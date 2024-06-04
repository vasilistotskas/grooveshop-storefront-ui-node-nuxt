<script lang="ts" setup>
import type { PropType } from 'vue'
import { withQuery } from 'ufo'
import { type AllAuthResponse, type AllAuthResponseError, type Flow, Flows } from '~/types/all-auth'

const props = defineProps({
  flow: { type: String as PropType<Flow['id']>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const { flow } = toRefs(props)

const route = useRoute()
const { t } = useI18n()

const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
const flows = computed(() => {
  if ('data' in authState.value && 'flows' in authState.value.data) {
    return authState.value.data.flows || []
  }

  return []
})

if (!flows.value.find(f => f.id === flow.value)) {
  if (flows.value.some(f => f.is_pending)) {
    const pending_flow = flows.value.find(f => f.is_pending)
    if (pending_flow) {
      navigateTo(pathForFlow(pending_flow.id))
    }
  }
}

const filteredFlows = computed(() => {
  return flows.value.filter(f => f.id !== flow.value)
})

const flowLabels = {
  [Flows.LOGIN]: t('common.login'),
  [Flows.LOGIN_BY_CODE]: t('common.login_by_code'),
  [Flows.SIGNUP]: t('common.signup'),
  [Flows.VERIFY_EMAIL]: t('common.verify_email'),
  [Flows.PROVIDER_REDIRECT]: t('common.provider_redirect'),
  [Flows.PROVIDER_SIGNUP]: t('common.provider_signup'),
  [Flows.PROVIDER_TOKEN]: t('common.provider_token'),
  [Flows.MFA_AUTHENTICATE]: t('common.mfa_authenticate'),
  [Flows.REAUTHENTICATE]: t('common.reauthenticate'),
  [Flows.MFA_REAUTHENTICATE]: t('common.mfa_reauthenticate'),
}

const toReauthenticatePath = (flowId: Flow['id']) => {
  return withQuery(pathForFlow(flowId), {
    next: route.query.next,
  })
}
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
          text-2xl font-bold text-primary-950

          dark:text-primary-50
        "
      >
        {{ $t('common.confirm_access') }}
      </h3>
      <p>
        {{ $t('common.reauthenticate') }}
      </p>
    </div>

    <slot />

    <div v-if="flows.length > 1" class="grid items-center justify-center gap-2">
      <p>{{ $t('common.alternative_options') }}</p>
      <ul class="grid items-center">
        <li
          v-for="f in filteredFlows"
          :key="f.id"
          class="grid items-center gap-2"
        >
          <UButton
            v-if="flow"
            :label="flowLabels[f.id] || flow"
            :to="toReauthenticatePath(f.id)"
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
