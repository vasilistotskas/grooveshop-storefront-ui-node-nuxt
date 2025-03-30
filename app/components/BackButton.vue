<script lang="ts" setup>
const router = useRouter()
const { $i18n } = useNuxtApp()
</script>

<template>
  <UButton
    class="!p-0"
    size="xl"
    color="neutral"
    variant="ghost"
    icon="i-heroicons-arrow-left-circle"
    :aria-label="$i18n.t('back')"
    @click="router.back()"
  />
</template>
