<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const appTitle = computed(() => config.public.appTitle as string)
</script>

<template>
  <div class="relative">
    <a
      href="#main-content"
      class="
        sr-only z-50 rounded-md bg-secondary px-4 py-2 text-sm font-medium
        text-white
        focus:not-sr-only focus:fixed focus:top-2 focus:left-2
      "
    >
      {{ t('a11y.skipToContent') }}
    </a>

    <header
      class="
        sticky top-0 z-40 w-full border-b border-primary-200
        bg-transparent backdrop-blur-md
        dark:border-primary-800
      "
    >
      <!-- Mobile: 3-column grid (back | logo | spacer) guarantees the
           logo column is centered regardless of the back-button width.
           Desktop: single flex row with the logo at the top-left. -->
      <div
        class="
          mx-auto grid max-w-main grid-cols-[auto_1fr_auto] items-center
          px-2 py-3
          md:py-4
          lg:flex lg:px-0
        "
      >
        <UButton
          :aria-label="t('back_to_cart')"
          :title="t('back_to_cart')"
          :to="localePath('cart')"
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="soft"
          size="lg"
          square
          class="
            rounded-full justify-self-start
            lg:hidden
          "
        />

        <Anchor
          :to="'index'"
          :aria-label="appTitle"
          class="
            flex items-center justify-center justify-self-center
            lg:justify-start lg:justify-self-start
          "
          :ui="{ base: 'p-0' }"
        >
          <NuxtImg
            :style="{ objectFit: 'contain' }"
            :src="'/img/logo-navbar.png'"
            :width="145"
            :height="30"
            alt=""
            quality="90"
            fetch-priority="high"
            preload
          />
          <span class="sr-only">{{ appTitle }}</span>
        </Anchor>

        <!-- Spacer matches the back-button square so the middle
             column stays geometrically centered. -->
        <div
          class="
            size-9 justify-self-end
            lg:hidden
          "
          aria-hidden="true"
        />
      </div>
    </header>

    <UMain
      id="main-content"
      as="main"
    >
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </UMain>
  </div>
</template>

<i18n lang="yaml">
el:
  a11y:
    skipToContent: Μετάβαση στο κύριο περιεχόμενο
  back_to_cart: Επιστροφή στο καλάθι
</i18n>
