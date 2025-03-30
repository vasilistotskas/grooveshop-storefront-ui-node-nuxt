<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const { loggedIn } = useUserSession()
const { isMobileOrTablet } = useDevice()
const isOpen = defineModel<boolean>()

watch(loggedIn, () => {
  if (loggedIn.value) {
    isOpen.value = false
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobileOrTablet"
    :title="t('title')"
    :description="t('description')"
  >
    <template #content>
      <UCard
        class="relative"
        :ui="{
          body: isMobileOrTablet? 'p-0 sm:p-0' : 'p-0 sm:p-0',
        }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xl"
          icon="i-heroicons-x-mark-20-solid"
          class="absolute right-4 top-4 z-50"
          :ui="{
            base: 'absolute right-4 top-4 z-50 hover:bg-transparent cursor-pointer',
          }"
          @click="isOpen = false"
        />
        <AccountLoginForm
          class="
          p-4

          md:p-8
        "
        />
      </UCard>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση
  description: Συνδέσου για να συνεχίσεις
</i18n>
