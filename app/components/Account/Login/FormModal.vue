<script lang="ts" setup>
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
  <UModal v-model="isOpen" :fullscreen="isMobileOrTablet">
    <UCard
      class="relative"
      :ui="{
        body: {
          padding: isMobileOrTablet? 'p-0 sm:p-0' : 'p-0 sm:p-0',
        },
      }"
    >
      <UButton
        color="primary"
        variant="solid"
        size="xl"
        icon="i-heroicons-x-mark-20-solid"
        class="absolute right-4 top-4 z-50"
        @click="isOpen = false"
      />
      <AccountLoginForm
        class="
          p-4

          md:p-8
        "
      />
    </UCard>
  </UModal>
</template>
