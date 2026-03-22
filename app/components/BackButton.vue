<script lang="ts" setup>
const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <UButton
    class="!p-0"
    size="xl"
    color="neutral"
    variant="ghost"
    icon="i-heroicons-arrow-left-circle"
    :aria-label="t('back')"
    @click="router.back()"
  />
</template>
