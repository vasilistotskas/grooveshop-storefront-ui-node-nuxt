<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The dark-theme switch of the «Εκ φύσεως Φυτειάς» header: one toggle
 * button, `aria-pressed` while the dark theme is on, its name the same in
 * both states (the state is the pressed attribute, not a changing label).
 *
 * The site starts from the visitor's OS preference, which the server
 * cannot know, so the control renders on the client only. Its fallback is
 * the same size, so nothing moves when it arrives. A press stores an
 * explicit choice, the way `UColorModeButton` does.
 *
 * `labelled` is the phone menu's row: the name beside the icon, full width.
 */
defineProps<{
  labelled?: boolean
}>()

const { t } = useI18n()
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
        inline-flex items-center justify-center gap-3 rounded-full
        border-2 border-(color:--fy-text) text-(--fy-text)
        hover:bg-(--fy-chip)
        focus-visible:outline-3 focus-visible:outline-offset-2
        focus-visible:outline-(color:--fy-focus)
      "
      :class="labelled ? 'min-h-[54px] w-full px-5 text-base font-semibold' : 'size-11'"
      :aria-pressed="dark"
      :aria-label="labelled ? undefined : t('dark_theme')"
      @click="toggle"
    >
      <UIcon
        :name="dark ? 'i-lucide:moon' : 'i-lucide:sun'"
        class="size-5"
        aria-hidden="true"
      />
      <span v-if="labelled">{{ t('dark_theme') }}</span>
    </button>
    <template #fallback>
      <span
        aria-hidden="true"
        class="block"
        :class="labelled ? 'min-h-[54px] w-full' : 'size-11'"
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
