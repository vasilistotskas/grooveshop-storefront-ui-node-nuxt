<script lang="ts" setup>
const props = defineProps<{
  title?: string
  heading?: string
  body?: string
  imageUrl?: string
  imagePosition?: 'left' | 'right'
  ctaText?: string
  ctaLink?: string
  decor?: 'none' | 'orbs' | 'gradient'
}>()

const imageFirst = computed(() => props.imagePosition !== 'right')
</script>

<template>
  <div
    v-if="heading || body || imageUrl"
    class="relative w-full overflow-hidden rounded-lg"
    :class="
      decor === 'gradient'
        ? `
          border border-primary-200 bg-gradient-to-b
          from-(--ui-color-primary-100) to-transparent p-6
          dark:border-primary-800 dark:from-(--ui-color-primary-900)
        `
        : ''
    "
  >
    <div
      v-if="decor === 'orbs'"
      aria-hidden="true"
      class="
        absolute -top-20 -right-20 size-64 rounded-full
        bg-(--ui-color-secondary-300)/25 blur-3xl
      "
    />
    <div
      class="
        relative grid items-center gap-8
        md:grid-cols-2
      "
    >
      <ImgWithFallback
        v-if="imageUrl"
        :src="imageUrl"
        :alt="heading || title || ''"
        class="
          h-64 w-full rounded-lg object-cover
          md:h-80
        "
        :class="imageFirst ? '' : 'md:order-2'"
        fit="cover"
        quality="80"
      />
      <div :class="imageFirst ? '' : 'md:order-1'">
        <h2
          v-if="heading"
          class="
            font-display mb-3 text-2xl font-bold text-balance
            md:text-3xl
          "
        >
          {{ heading }}
        </h2>
        <p
          v-if="body"
          class="
            whitespace-pre-line text-primary-700
            dark:text-primary-300
          "
        >
          {{ body }}
        </p>
        <NuxtLink
          v-if="ctaText && ctaLink"
          :to="ctaLink"
          class="mt-5 inline-block"
        >
          <UButton
            :label="ctaText"
            color="secondary"
            variant="solid"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
