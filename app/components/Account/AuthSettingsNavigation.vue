<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
const { $i18n, $routeBaseName } = useNuxtApp()
const authStore = useAuthStore()
const { totpAuthenticator, webauthnAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

const isDrawerOpen = ref(false)

const items = computed(() => {
  const navigationItems: NavigationMenuItem[][] = [
    [
      {
        label: t('navigation.account_security'),
        type: 'label',
      },
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
    ],
    [
      {
        label: t('navigation.two_factor'),
        type: 'label',
      },
      !totpAuthenticator.value
        ? {
            label: $i18n.t('two_factor.activate'),
            icon: 'i-heroicons-shield-check',
            to: localePath('account-2fa-totp-activate'),
            value: 'account-2fa-totp-activate',
            badge: {
              label: t('navigation.recommended'),
              color: 'success',
              variant: 'soft',
              size: 'xs',
            },
          }
        : {
            label: $i18n.t('two_factor.totp'),
            icon: 'i-heroicons-device-phone-mobile',
            value: 'account-2fa-totp',
            defaultOpen: false,
            children: [
              {
                label: $i18n.t('two_factor.deactivate'),
                icon: 'i-heroicons-shield-exclamation',
                description: t('navigation.deactivate_totp_desc'),
                to: localePath('account-2fa-totp-deactivate'),
              },
            ],
          },
      webauthnAuthenticator.value || recoveryCodesAuthenticator.value
        ? {
            label: $i18n.t('two_factor.webauthn.title'),
            icon: 'i-heroicons-key',
            value: 'account-2fa-webauthn-section',
            defaultOpen: ['account-2fa-webauthn', 'account-2fa-webauthn-add'].includes(
              $routeBaseName(route) || '',
            ),
            children: [
              ...(recoveryCodesAuthenticator.value
                ? [
                    {
                      label: $i18n.t('two_factor.webauthn.manage'),
                      icon: 'i-heroicons-rectangle-stack',
                      description: t('navigation.manage_keys_desc'),
                      to: localePath('account-2fa-webauthn'),
                    },
                  ]
                : []),
              {
                label: $i18n.t('two_factor.webauthn.add.title'),
                icon: 'i-heroicons-plus-circle',
                description: t('navigation.add_key_desc'),
                to: localePath('account-2fa-webauthn-add'),
              },
            ],
          }
        : {
            label: $i18n.t('two_factor.webauthn.add.title'),
            icon: 'i-heroicons-key',
            to: localePath('account-2fa-webauthn-add'),
            value: 'account-2fa-webauthn-add',
          },
      ...(webauthnAuthenticator.value
        ? [
            {
              label: $i18n.t('two_factor.recovery_codes.title'),
              icon: 'i-heroicons-ticket',
              value: 'account-2fa-recovery-section',
              defaultOpen: ['account-2fa-recovery-codes', 'account-2fa-recovery-codes-generate'].includes(
                $routeBaseName(route) || '',
              ),
              children: [
                {
                  label: $i18n.t('two_factor.recovery_codes.view'),
                  icon: 'i-heroicons-eye',
                  description: t('navigation.view_codes_desc'),
                  to: localePath('account-2fa-recovery-codes'),
                },
                {
                  label: $i18n.t('two_factor.recovery_codes.generate'),
                  icon: 'i-heroicons-arrow-path',
                  description: t('navigation.generate_codes_desc'),
                  to: localePath('account-2fa-recovery-codes-generate'),
                },
              ],
            },
          ]
        : []),
    ],
  ]

  return navigationItems
})

const routeName = computed(() => $routeBaseName(route))

const selectedValue = computed(() => {
  const currentRoute = routeName.value
  if (!currentRoute) return ''
  for (const group of items.value) {
    for (const item of group) {
      if (item.value === currentRoute) return item.to
      if (item.children) {
        for (const child of item.children) {
          if (child.to === localePath(currentRoute)) return child.to
        }
      }
    }
  }
  return localePath(currentRoute)
})

const activeItem = computed(() => {
  for (const group of items.value) {
    for (const item of group) {
      if (item.type === 'label') continue
      if (item.to === selectedValue.value) return item
      if (item.children) {
        for (const child of item.children) {
          if (child.to === selectedValue.value) return child
        }
      }
    }
  }
  return null
})

watch(() => route.path, () => {
  if (isMobileOrTablet && isDrawerOpen.value) {
    isDrawerOpen.value = false
  }
})
</script>

<template>
  <UDrawer
    v-if="isMobileOrTablet"
    v-model:open="isDrawerOpen"
    :title="t('navigation.settings')"
    :description="t('navigation.settings_description')"
    direction="bottom"
    :ui="{
      content: 'h-[85vh] max-h-[85vh]',
      body: 'flex-1 overflow-y-auto p-0',
    }"
  >
    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      class="w-full justify-between"
      trailing-icon="i-heroicons-chevron-down"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon
          v-if="activeItem?.icon"
          :name="activeItem.icon"
          class="size-5 shrink-0"
        />
        <span class="truncate">
          {{ activeItem?.label || t('navigation.settings') }}
        </span>
      </div>
    </UButton>

    <template #body>
      <UNavigationMenu
        orientation="vertical"
        color="neutral"
        variant="pill"
        :highlight="true"
        highlight-color="primary"
        :items="items"
        :collapsible="true"
        type="multiple"
        class="p-3"
      />
    </template>
  </UDrawer>

  <UCard
    v-else
    variant="outline"
    class="
      w-full
      lg:w-72
    "
    :ui="{
      body: 'p-2 sm:p-3',
    }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-cog-6-tooth"
          class="size-5 text-primary"
        />
        <h3 class="text-sm font-semibold">
          {{ t('navigation.settings') }}
        </h3>
      </div>
    </template>

    <UNavigationMenu
      orientation="vertical"
      color="neutral"
      variant="pill"
      :highlight="true"
      highlight-color="primary"
      :items="items"
      :collapsible="true"
      type="multiple"
    />
  </UCard>
</template>

<i18n lang="yaml">
el:
  navigation:
    settings: Ρυθμίσεις
    settings_description: Διαχειρίσου τον λογαριασμό και την ασφάλειά σου
    account_security: Λογαριασμός & Ασφάλεια
    two_factor: Έλεγχος Ταυτότητας Δύο Παραγόντων
    recommended: Συνιστάται
    deactivate_totp_desc: Απενεργοποίησε τον έλεγχο ταυτότητας εφαρμογής
    manage_keys_desc: Διαχείριση των κλειδιών ασφαλείας σου
    add_key_desc: Πρόσθεσε ένα νέο κλειδί ασφαλείας
    view_codes_desc: Δες τους κωδικούς ανάκτησής σου
    generate_codes_desc: Δημιούργησε νέους κωδικούς ανάκτησης
</i18n>
