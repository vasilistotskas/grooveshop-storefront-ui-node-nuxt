<script setup lang="ts">
const isOpen = ref(true)

watch(
  () => isOpen.value,
  (value) => {
    if (!value) {
      useModalRouter().close()
    }
  },
)
</script>

<template>
  <UModal
    v-model="isOpen" :ui="{
      width: 'w-full max-w-md',
    }"
  >
    <AuthRegistrationForm />
  </UModal>
</template>
