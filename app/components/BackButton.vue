<script lang="ts" setup>
const router = useRouter()
const { $i18n } = useNuxtApp()
</script>

<template>
  <UButton
    class="!p-0"
    size="xl"
    type="link"
    color="primary"
    variant="ghost"
    icon="i-heroicons-arrow-left-circle"
    :aria-label="$i18n.t('back')"
    :ui="{
      icon: {
        size: {
          xl: 'h-6 w-6',
        },
      },
    }"
    @click="router.back()"
  />
</template>
