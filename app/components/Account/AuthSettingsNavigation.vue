<script lang="ts" setup>
import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

const localePath = useLocalePath()
const router = useRouter()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const { $i18n, $routeBaseName } = useNuxtApp()
const authStore = useAuthStore()
const { totpAuthenticator, webauthnAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

const items = computed(() => {
  const items = [
    {
      label: $i18n.t('social_accounts'),
      icon: 'i-heroicons-user-group',
      to: localePath('account-providers'),
      value: 'account-providers',
    },
    {
      label: $i18n.t('sessions'),
      icon: 'i-heroicons-signal',
      to: localePath('account-sessions'),
      value: 'account-sessions',
    },
    {
      label: $i18n.t('password.change'),
      icon: 'i-heroicons-lock-closed',
      to: localePath('account-password-change'),
      value: 'account-password-change',
    },
    !totpAuthenticator.value
      ? {
          label: $i18n.t('two_factor.activate'),
          icon: 'i-heroicons-lock-open',
          to: localePath('account-2fa-totp-activate'),
          value: 'account-2fa-totp-activate',
        }
      : {
          label: $i18n.t('two_factor.deactivate'),
          icon: 'i-heroicons-chart-bar',
          to: localePath('account-2fa-totp-deactivate'),
          value: 'account-2fa-totp-deactivate',
        },
  ]

  if (webauthnAuthenticator.value) {
    items.push({
      label: $i18n.t('two_factor.recovery_codes.title'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-recovery-codes'),
      value: 'account-2fa-recovery-codes',
    }, {
      label: $i18n.t('two_factor.recovery_codes.generate'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-recovery-codes-generate'),
      value: 'account-2fa-recovery-codes-generate',
    })
  }

  if (recoveryCodesAuthenticator.value) {
    items.push({
      label: $i18n.t('two_factor.webauthn.title'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-webauthn'),
      value: 'account-2fa-webauthn',
    })
  }
  else {
    items.push({
      label: $i18n.t('two_factor.webauthn.add'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-webauthn-add'),
      value: 'account-2fa-webauthn-add',
    })
  }

  return items
})

const routeName = computed(() => $routeBaseName(route as unknown as keyof RouteNamedMapI18n))

const selectedValue = computed(() => routeName.value)

const activeItem = computed(() => {
  return items.value.find(item => item.value === routeName.value)
})

function handleNavigate(value: string) {
  const item = items.value.find(i => i.value === value)
  if (item?.to) {
    router.push(item.to)
  }
}
</script>

<template>
  <USelectMenu
    v-if="isMobileOrTablet"
    :model-value="selectedValue"
    :items="items"
    value-key="value"
    size="lg"
    color="neutral"
    variant="outline"
    class="w-full"
    @update:model-value="handleNavigate"
  >
    <template #leading>
      <UIcon
        v-if="activeItem?.icon"
        :name="activeItem.icon"
        class="size-5"
      />
    </template>
    <template #item-leading="{ item }">
      <UIcon
        :name="item.icon"
        class="size-5"
      />
    </template>
  </USelectMenu>
  <UNavigationMenu
    v-else
    orientation="vertical"
    color="neutral"
    :items="items"
  />
</template>
