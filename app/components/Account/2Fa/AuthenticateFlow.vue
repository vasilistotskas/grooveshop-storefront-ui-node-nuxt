<script lang="ts" setup>
import type { PropType } from 'vue'
import {
  AuthenticatorType,
  type AuthenticatorTypeValues, Flows,
} from '~/types/all-auth'

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

const flow = computed(() => authInfo?.pendingFlow)

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('/'))
}

const labels = {
  [AuthenticatorType.TOTP]: t('common.mfa_reauthenticate.totp'),
  [AuthenticatorType.RECOVERY_CODES]: t('common.mfa_reauthenticate.recovery_codes'),
  [AuthenticatorType.WEBAUTHN]: t('common.mfa_reauthenticate.webauthn'),
}

const filteredFlows = computed(() => {
  const currentPath = router.currentRoute.value.path
  return flow.value?.types
    ?.map((type) => {
      const path = flow.value ? pathForFlow(flow.value, type) : ''
      return {
        label: labels[type],
        id: type,
        path,
      }
    })
    .filter(f => f.path !== currentPath)
})
</script>

<template>
  <section
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
        {{ $t('common.2fa.title') }}
      </h3>
      <p>
        {{ $t('common.2fa.subtitle') }}
      </p>
    </div>

    <slot />

    <div
      v-if="flow && flow.types && flow?.types?.length > 1" class="
        grid items-center justify-center gap-2
      "
    >
      <p>{{ $t('common.alternative_options') }}</p>
      <ul class="grid items-center">
        <li
          v-for="f in filteredFlows"
          :key="f.id"
          class="grid items-center gap-2"
        >
          <UButton
            :label="f.label"
            :to="f.path"
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
  </section>
</template>
