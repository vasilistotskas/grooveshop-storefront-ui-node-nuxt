<script lang="ts" setup>
/**
 * The signed-in shopper at the top of the phone menu: their initials,
 * their name, and — on a store that runs the loyalty programme — their
 * tier and points; their email otherwise. The whole card links to the
 * account.
 *
 * Mounted only while the menu is open (see `Chrome/MobileMenu.vue`),
 * which is when the loyalty summary is worth asking for.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const { user } = useUserSession()
const tenantStore = useTenantStore()

const loyaltyRuntimeEnabled = useSettingFlag('LOYALTY_ENABLED', { fallback: false })
const loyaltyEnabled = computed(
  () => tenantStore.loyaltyEnabled && loyaltyRuntimeEnabled.value,
)

const name = computed(() =>
  [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' '),
)
</script>

<template>
  <ULink
    :to="localePath('account')"
    class="
      flex items-center gap-3 rounded-md border border-default bg-default
      p-3.5
    "
  >
    <UAvatar
      :alt="name || user?.email"
      size="xl"
      :ui="{
        root: 'bg-volt',
        fallback: 'font-extrabold text-on-volt',
      }"
    />
    <span class="flex min-w-0 flex-1 flex-col">
      <strong class="truncate text-[0.9375rem] text-highlighted">
        {{ name || t('account') }}
      </strong>
      <ChromeMobileMenuLoyalty v-if="loyaltyEnabled" />
      <span
        v-else
        class="truncate text-xs text-muted"
      >{{ user?.email }}</span>
    </span>
    <UIcon
      name="i-heroicons-chevron-right"
      class="size-5 text-muted"
    />
  </ULink>
</template>
