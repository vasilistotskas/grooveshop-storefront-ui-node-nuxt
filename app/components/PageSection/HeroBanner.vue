<script lang="ts" setup>
const props = defineProps<{
  title?: string
  heading?: string
  subheading?: string
  eyebrow?: string
  imageUrl?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  overlayOpacity?: number
  decor?: 'none' | 'orbs' | 'gradient'
}>()

// The photo hero keeps its original rendering; a decor choice with no
// image switches to the typographic variant (surface, orbs/gradient,
// display face, woven-thread underline).
const typographic = computed(
  () => !props.imageUrl && !!props.decor && props.decor !== 'none',
)
</script>

<template>
  <div
    v-if="typographic"
    class="
      relative overflow-hidden rounded-lg border border-primary-200
      bg-primary-50 px-6 py-16 text-center
      md:py-24
      dark:border-primary-800 dark:bg-primary-950
    "
  >
    <template v-if="decor === 'orbs'">
      <div
        aria-hidden="true"
        class="
          absolute -top-24 -left-20 size-80 rounded-full
          bg-(--ui-color-primary-300)/30 blur-3xl
        "
      />
      <div
        aria-hidden="true"
        class="
          absolute -right-16 -bottom-28 size-72 rounded-full
          bg-(--ui-color-secondary-300)/25 blur-3xl
        "
      />
    </template>
    <div
      v-else-if="decor === 'gradient'"
      aria-hidden="true"
      class="
        absolute inset-0
        bg-gradient-to-b from-(--ui-color-primary-100) to-transparent
        dark:from-(--ui-color-primary-900)
      "
    />
    <div class="relative mx-auto flex max-w-2xl flex-col items-center gap-4">
      <p
        v-if="eyebrow"
        class="
          text-sm font-bold tracking-[0.14em] text-(--ui-secondary)
          uppercase
        "
      >
        {{ eyebrow }}
      </p>
      <h1
        v-if="heading"
        class="
          font-display text-4xl font-bold text-balance text-primary-950
          md:text-5xl
          dark:text-primary-50
        "
      >
        {{ heading }}
      </h1>
      <hr
        aria-hidden="true"
        class="woven-thread w-28"
      >
      <p
        v-if="subheading"
        class="
          max-w-xl text-lg text-primary-700
          dark:text-primary-200
        "
      >
        {{ subheading }}
      </p>
      <div
        v-if="(ctaText && ctaLink) || (secondaryCtaText && secondaryCtaLink)"
        class="mt-2 flex flex-wrap justify-center gap-3"
      >
        <NuxtLink
          v-if="ctaText && ctaLink"
          :to="ctaLink"
        >
          <UButton
            :label="ctaText"
            color="secondary"
            variant="solid"
            size="lg"
          />
        </NuxtLink>
        <NuxtLink
          v-if="secondaryCtaText && secondaryCtaLink"
          :to="secondaryCtaLink"
        >
          <UButton
            :label="secondaryCtaText"
            color="neutral"
            variant="outline"
            size="lg"
          />
        </NuxtLink>
      </div>
    </div>
  </div>

  <div
    v-else
    class="relative overflow-hidden rounded-lg bg-neutral-900"
  >
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
      <p
        v-if="eyebrow"
        class="mb-2 text-sm font-bold tracking-[0.14em] uppercase"
      >
        {{ eyebrow }}
      </p>
      <h1
        v-if="heading"
        class="font-display text-3xl font-bold md:text-5xl"
      >
        {{ heading }}
      </h1>
      <p
        v-if="subheading"
        class="mt-2 text-lg md:text-xl"
      >
        {{ subheading }}
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <NuxtLink
          v-if="ctaText && ctaLink"
          :to="ctaLink"
        >
          <UButton
            :label="ctaText"
            size="lg"
          />
        </NuxtLink>
        <NuxtLink
          v-if="secondaryCtaText && secondaryCtaLink"
          :to="secondaryCtaLink"
        >
          <UButton
            :label="secondaryCtaText"
            color="neutral"
            variant="outline"
            size="lg"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
