<script lang="ts" setup>
import type { NavigationMenuItem } from '#ui/types'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useStoreI18n('components/variants/webside/Account/AuthSettingsNavigation')
const { isMobileOrTablet } = useDevice()
const { $routeBaseName } = useNuxtApp()

const isDrawerOpen = ref(false)

const routeName = computed(() => {
  const name = $routeBaseName(route)
  return typeof name === 'string' ? name : ''
})

// Security stays the active entry on every page under it (email, password,
// devices, connected accounts, every two-step page).
const items = computed<NavigationMenuItem[]>(() => [
  {
    label: t('navigation.profile'),
    icon: 'i-heroicons-user',
    to: localePath('account-settings'),
    active: routeName.value === 'account-settings',
  },
  {
    label: t('navigation.security'),
    icon: 'i-heroicons-shield-check',
    to: localePath('account-security'),
    active: isSecurityPage(routeName.value),
  },
  {
    label: t('navigation.privacy'),
    icon: 'i-heroicons-lock-closed',
    to: localePath('account-settings-privacy'),
    active: routeName.value === 'account-settings-privacy',
  },
])

const activeItem = computed(() => items.value.find(item => item.active) ?? null)

watch(() => route.path, () => {
  if (isMobileOrTablet.value && isDrawerOpen.value) {
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
      body: `
        p-2
        sm:p-3
      `,
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
    profile: Προφίλ
    security: Ασφάλεια
    privacy: Απόρρητο & Δεδομένα
en:
  navigation:
    settings: Settings
    settings_description: Manage your account and its security
    profile: Profile
    security: Security
    privacy: Privacy & Data
</i18n>
