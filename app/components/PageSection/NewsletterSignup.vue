<script lang="ts" setup>
defineProps<{
  title?: string
  heading?: string
  description?: string
  placeholder?: string
}>()

const { t } = useI18n()
const email = ref('')
</script>

<template>
  <div class="mx-auto max-w-(--container-main) rounded-lg bg-neutral-50 p-8 text-center dark:bg-neutral-800 md:p-12">
    <h2
      v-if="heading || title"
      class="text-2xl font-bold"
    >
      {{ heading || title }}
    </h2>
    <p
      v-if="description"
      class="mt-2 text-neutral-600 dark:text-neutral-300"
    >
      {{ description }}
    </p>
    <div class="mx-auto mt-4 flex max-w-md gap-2">
      <UInput
        v-model="email"
        type="email"
        :placeholder="placeholder || t('newsletter.placeholder')"
        class="flex-1"
      />
      <UButton :label="t('newsletter.subscribe')" />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  newsletter:
    placeholder: Email
    subscribe: Εγγραφή
</i18n>
