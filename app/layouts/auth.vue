<script lang="ts" setup>
const config = useRuntimeConfig()

const appTitle = computed(() => config.public.appTitle as string)

const colorModeCookie = useCookie(
  'color-mode',
)

const searchBarFocused = useState<boolean>('searchBarFocused')

const logo = computed(() => {
  return colorModeCookie.value === 'dark'
    ? '/img/logo-dark-mode.png'
    : '/img/logo-light-mode.png'
})
</script>

<template>
  <div class="container-3xs relative">
    <div class="mt-12 grid items-center justify-center">
      <Anchor
        :aria-label="appTitle"
        class="
          text-md flex items-center gap-2 overflow-hidden font-bold

          md:w-auto
        "
        to="/"
      >
        <NuxtImg
          :alt="appTitle"
          :height="75"
          :src="logo"
          :style="{ objectFit: 'contain' }"
          :width="500"
          format="png"
          quality="100"
          loading="eager"
          preload
        />
      </Anchor>
    </div>
    <main
      class="
        pt-[48px]

        lg:pt-[63px]

        md:pt-[56px]
      "
      :class="{
        'opacity-70': searchBarFocused,
      }"
    >
      <PageSection class="flex flex-col">
        <div class="flex w-full flex-1 flex-col">
          <slot />
        </div>
      </PageSection>
    </main>
  </div>
</template>
