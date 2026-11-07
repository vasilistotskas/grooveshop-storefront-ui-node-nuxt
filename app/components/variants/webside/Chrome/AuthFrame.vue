<script lang="ts" setup>
/**
 * Webside's frame for the sign-in, sign-up and re-authentication pages: the
 * store's `AUTH_PANEL` photo, with its line over the foot, beside the page
 * from `lg` up. Below `lg` the page stands alone, as it always did.
 *
 * It shows what the store configured and nothing else: no photo, no panel
 * (the page keeps the whole row); no line, a photo alone. The photo is
 * decorative, so the page's own heading stays the page's one `<h1>`.
 */
defineSlots<{
  default(props: object): any
}>()

const { authPanel } = useStoreSettings()
const { locale } = useI18n({ useScope: 'global' })

const photo = computed(() => authPanel.value?.imageUrl || '')
const tagline = computed(() =>
  authPanel.value ? authPanelTagline(authPanel.value, locale.value) : '',
)
</script>

<template>
  <div
    v-if="photo"
    class="
      mx-auto w-full max-w-8xl
      lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8
    "
  >
    <!-- `sizes` names a breakpoint (`lg:50vw`): a bare `50vw` is read as a
         size of 50 in a screen that does not exist. Lazy, so a phone, where
         the panel is hidden, never fetches the photo. -->
    <aside
      class="
        relative hidden overflow-hidden rounded-xl
        lg:sticky lg:top-24 lg:mt-4 lg:block lg:h-[calc(100dvh-8rem)]
        lg:min-h-96 lg:self-start
      "
    >
      <ImgWithFallback
        :src="photo"
        alt=""
        :width="960"
        :height="1080"
        sizes="lg:50vw"
        fit="cover"
        loading="lazy"
        class="absolute inset-0 size-full object-cover"
      />
      <div
        v-if="tagline"
        aria-hidden="true"
        class="
          absolute inset-0 bg-linear-to-t from-inverted/90 via-inverted/0
          via-45% to-inverted/15
        "
      />
      <p
        v-if="tagline"
        class="
          absolute inset-x-0 bottom-0 p-8 text-3xl/tight font-bold text-balance
          text-inverted
        "
      >
        {{ tagline }}
      </p>
    </aside>
    <div class="min-w-0">
      <slot />
    </div>
  </div>
  <slot v-else />
</template>
