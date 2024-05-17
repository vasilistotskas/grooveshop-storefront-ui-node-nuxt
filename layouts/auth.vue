<script lang="ts" setup>
const config = useRuntimeConfig()

const appTitle = computed(() => config.public.appTitle as string)

const colorModeCookie = useCookie(
  'color-mode',
)

const logo = computed(() => {
  return colorModeCookie.value === 'dark'
    ? '/img/logo-dark-mode.png'
    : '/img/logo-light-mode.png'
})
</script>

<template>
  <div class="relative">
    <div class="mt-12 grid items-center justify-center">
      <NuxtImg
        :style="{ objectFit: 'contain' }"
        :src="logo"
        :width="500"
        :height="75"
        :alt="appTitle"
        loading="eager"
        format="webp"
        densities="x1"
        preload
      />
    </div>
    <main
      class="
        pt-[48px]

        lg:pt-[63px]

        md:pt-[56px]
      "
    >
      <PageSection class="flex flex-col">
        <div class="flex w-full flex-1 flex-col">
          <slot />
        </div>
      </PageSection>
    </main>
  </div>
</template>
