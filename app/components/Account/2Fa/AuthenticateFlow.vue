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
const { $i18n } = useNuxtApp()

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
      path: flow.value ? pathForFlow(flow.value, type) : null,
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
          text-primary-950 text-2xl font-bold

          dark:text-primary-50
        "
      >
        {{ $i18n.t('2fa.title') }}
      </h3>
      <p>
        {{ $i18n.t('2fa.subtitle') }}
      </p>
    </div>

    <slot />

    <div
      v-if="flow && flow.types && flow?.types?.length > 1"
      class="
        grid items-center justify-center gap-2
      "
    >
      <p>{{ $i18n.t('alternative_options') }}</p>
      <ul class="grid items-center">
        <li
          v-for="f in filteredFlows"
          :key="f.id"
          class="grid items-center gap-2"
        >
          <UButton
            v-if="f.path"
            :label="f.label"
            :to="localePath({
              name: f.path,
              query: { next },
            })"
            class="p-0"
            color="neutral"
            :disabled="isCurrentPath(f.path)"
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
