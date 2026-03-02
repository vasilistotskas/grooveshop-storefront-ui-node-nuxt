<script lang="ts" setup>
defineProps<{
  title?: string
  heading?: string
  description?: string
  buttonText?: string
  buttonLink?: string
  backgroundColor?: string
}>()
</script>

<template>
  <div
    class="mx-auto max-w-(--container-main) rounded-lg p-8 text-center md:p-12"
    :style="backgroundColor ? { backgroundColor } : undefined"
    :class="!backgroundColor ? 'bg-primary-50 dark:bg-primary-900' : ''"
  >
    <h2
      v-if="heading || title"
      class="text-2xl font-bold md:text-3xl"
    >
      {{ heading || title }}
    </h2>
    <p
      v-if="description"
      class="mt-2 text-lg text-neutral-600 dark:text-neutral-300"
    >
      {{ description }}
    </p>
    <NuxtLink
      v-if="buttonText && buttonLink"
      :to="buttonLink"
      class="mt-4 inline-block"
    >
      <UButton
        :label="buttonText"
        size="lg"
      />
    </NuxtLink>
  </div>
</template>
