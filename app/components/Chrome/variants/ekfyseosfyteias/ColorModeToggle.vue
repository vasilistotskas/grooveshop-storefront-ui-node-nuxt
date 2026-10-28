<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The dark-theme switch of the «Εκ φύσεως Φυτειάς» header: one round
 * toggle button, `aria-pressed` while the dark theme is on, its name the
 * same in both states (the state is the pressed attribute, not a changing
 * label). The same button on the bar and in the phone menu: an icon, with
 * its name for assistive technology only.
 *
 * The site starts from the visitor's OS preference, which the server
 * cannot know, so the control renders on the client only. Its fallback is
 * the same size, so nothing moves when it arrives. A press stores an
 * explicit choice, the way `UColorModeButton` does.
 */
const { t } = useStoreI18n('components/Chrome/variants/ekfyseosfyteias/ColorModeToggle')
const colorMode = useColorMode()

const dark = computed(() => colorMode.value === 'dark')

const toggle = () => {
  colorMode.preference = dark.value ? 'light' : 'dark'
}
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="
        inline-flex size-11 items-center justify-center rounded-full border-2
        border-(color:--fy-text) text-(--fy-text)
        hover:bg-(--fy-chip)
        focus-visible:outline-3 focus-visible:outline-offset-2
        focus-visible:outline-(color:--fy-focus)
      "
      :aria-pressed="dark"
      :aria-label="t('dark_theme')"
      @click="toggle"
    >
      <UIcon
        :name="dark ? 'i-lucide:moon' : 'i-lucide:sun'"
        class="size-5"
        aria-hidden="true"
      />
    </button>
    <template #fallback>
      <span
        aria-hidden="true"
        class="block size-11"
      />
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  dark_theme: Σκούρο θέμα
en:
  dark_theme: Dark theme
</i18n>
