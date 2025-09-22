<script lang="ts" setup>
const config = useRuntimeConfig()

const appTitle = computed(() => config.public.appTitle as string)

const searchBarFocused = useState<boolean>('search-bar-focused')
</script>

<template>
  <div class="relative container mx-auto">
    <div class="mt-12 grid items-center justify-center">
      <Anchor
        :aria-label="appTitle"
        class="
          flex items-center gap-2 overflow-hidden text-base font-bold
          md:w-auto
        "
        to="index"
      >
        <NuxtImg
          :style="{ objectFit: 'contain' }"
          :src="'/img/logo-navbar.svg'"
          :width="145"
          :height="30"
          :alt="appTitle"
          quality="100"
          preload
        />
      </Anchor>
    </div>
    <main
      class="
        pt-[57px]
        md:pt-[65px]
        lg:pt-[65px]
      "
      :class="{
        'opacity-70': searchBarFocused,
      }"
    >
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </main>
  </div>
</template>
