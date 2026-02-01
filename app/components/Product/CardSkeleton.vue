<script lang="ts" setup>
/**
 * Product Card Skeleton Loader
 *
 * Displays a loading placeholder that matches the structure of the Product Card component.
 * Features a shimmer animation to indicate loading progress.
 *
 * @component
 */
</script>

<template>
  <UCard
    as="li"
    class="relative h-full w-full max-w-full"
    :ui="{
      root: 'w-full max-w-full',
      body: `
        p-0
        sm:p-0
      `,
    }"
  >
    <!-- Image Container with Shimmer -->
    <div class="relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
      <!-- Top-left badges placeholder -->
      <div class="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <USkeleton class="h-6 w-16 rounded-md" />
      </div>

      <!-- Top-right action buttons placeholder -->
      <div class="absolute top-4 right-4 z-10 flex gap-2">
        <USkeleton class="size-8 rounded-md" />
        <USkeleton class="size-8 rounded-md" />
      </div>

      <!-- Product image placeholder with proper aspect ratio (4:3) -->
      <div class="aspect-[4/3] max-w-full">
        <USkeleton class="size-full" />
      </div>
    </div>

    <!-- Content Container -->
    <div class="flex flex-col gap-4 p-6">
      <!-- Product title placeholder (2 lines) -->
      <div class="flex flex-col gap-2">
        <USkeleton class="h-5 w-full" />
        <USkeleton class="h-5 w-3/4" />
      </div>

      <!-- Rating placeholder -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <USkeleton
            v-for="i in 5"
            :key="i"
            class="size-4 rounded-sm"
          />
        </div>
        <USkeleton class="h-4 w-16" />
      </div>

      <!-- Price section placeholder -->
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between">
          <div class="flex flex-col gap-1">
            <USkeleton class="h-3 w-20" />
            <USkeleton class="h-8 w-24" />
          </div>
        </div>
      </div>

      <!-- Add to cart button placeholder -->
      <USkeleton class="h-10 w-full rounded-md" />
    </div>
  </UCard>
</template>

<style scoped>
/**
 * Shimmer animation for skeleton loaders
 * Creates a subtle moving gradient effect to indicate loading
 */
:deep(.u-skeleton) {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgb(var(--color-neutral-200)) 0%,
    rgb(var(--color-neutral-100)) 50%,
    rgb(var(--color-neutral-200)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

:deep(.dark .u-skeleton) {
  background: linear-gradient(
    90deg,
    rgb(var(--color-neutral-800)) 0%,
    rgb(var(--color-neutral-700)) 50%,
    rgb(var(--color-neutral-800)) 100%
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/**
 * Reduced motion support
 * Disables animations for users who prefer reduced motion
 */
@media (prefers-reduced-motion: reduce) {
  :deep(.u-skeleton) {
    animation: none;
  }
}
</style>
