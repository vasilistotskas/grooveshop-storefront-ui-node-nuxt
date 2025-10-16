<script lang="ts" setup>
const config = useRuntimeConfig()

const appTitle = computed(() => config.public.appTitle as string)
</script>

<template>
  <div class="relative container mx-auto">
    <div
      class="
        mt-8 grid items-center justify-center
        md:mt-12
      "
    >
      <Anchor
        :aria-label="appTitle"
        class="
          flex items-center gap-2 overflow-hidden text-base font-bold
          md:w-auto
        "
        to="index"
        :ui="{
          base: 'p-0',
        }"
      >
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          :src="'/img/logo-navbar.svg'"
          :width="145"
          :height="30"
          :alt="appTitle"
          quality="80"
          preload
        />
      </Anchor>
    </div>
    <main>
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </main>
  </div>
</template>
