<script lang="ts" setup>
defineProps<{
  title?: string
  heading?: string
  subheading?: string
  imageUrl?: string
  ctaText?: string
  ctaLink?: string
  overlayOpacity?: number
}>()
</script>

<template>
  <div class="relative overflow-hidden rounded-lg bg-neutral-900">
    <ImgWithFallback
      v-if="imageUrl"
      :src="imageUrl"
      :alt="heading || title || ''"
      class="h-64 w-full object-cover md:h-96"
      fit="cover"
      quality="80"
    />
    <div
      v-if="overlayOpacity"
      class="absolute inset-0 bg-black"
      :style="{ opacity: overlayOpacity }"
    />
    <div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
      <h1
        v-if="heading"
        class="text-3xl font-bold md:text-5xl"
      >
        {{ heading }}
      </h1>
      <p
        v-if="subheading"
        class="mt-2 text-lg md:text-xl"
      >
        {{ subheading }}
      </p>
      <NuxtLink
        v-if="ctaText && ctaLink"
        :to="ctaLink"
        class="mt-4"
      >
        <UButton
          :label="ctaText"
          size="lg"
        />
      </NuxtLink>
    </div>
  </div>
</template>
