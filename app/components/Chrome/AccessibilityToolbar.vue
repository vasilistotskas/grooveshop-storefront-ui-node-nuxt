<script lang="ts" setup>
import '~/assets/css/accessibility.css'

/**
 * The accessibility toolbar: a round button with the universal-access
 * figure, fixed in the bottom corner, that opens a side panel of the
 * visitor's own display preferences — text size, high contrast,
 * grayscale, underlined links, a plain font, wider text spacing and no
 * motion. They are remembered in this browser
 * (`useAccessibilityPreferences`) and applied before the first paint by
 * the inline script this component puts in <head>.
 *
 * The panel is a dialog (`USlideover`): it takes focus, has a title for
 * its name, closes on Escape and gives focus back to the button. Every
 * preference is a toggle button that says whether it is on
 * (`aria-pressed`). A store's chrome mounts it early in its header, so
 * the button is one of the first things a keyboard reaches.
 */
const { t } = useI18n()
const {
  preferences,
  textPercent,
  canEnlarge,
  canShrink,
  isDefault,
  toggle,
  enlarge,
  shrink,
  reset,
} = useAccessibilityPreferences()

useHead({
  script: [{ key: 'a11y-preferences', innerHTML: accessibilityHeadScript(), tagPriority: 'critical' }],
})

const TOGGLES: Array<{ key: AccessibilityToggle, icon: string }> = [
  { key: 'contrast', icon: 'i-lucide-contrast' },
  { key: 'grayscale', icon: 'i-lucide-droplet-off' },
  { key: 'links', icon: 'i-lucide-underline' },
  { key: 'font', icon: 'i-lucide-type' },
  { key: 'spacing', icon: 'i-lucide-whole-word' },
  { key: 'motion', icon: 'i-lucide-circle-pause' },
]
</script>

<template>
  <USlideover
    :title="t('title')"
    :description="t('description')"
    side="right"
    :ui="{ content: 'max-w-sm' }"
  >
    <UButton
      icon="i-fa6-solid-universal-access"
      color="neutral"
      size="xl"
      square
      :aria-label="t('open')"
      :ui="{ leadingIcon: 'size-7' }"
      class="
        a11y-fab fixed right-4 bottom-4 z-50 size-14 justify-center
        rounded-full shadow-lg
      "
    />

    <template #body>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between gap-4">
          <span
            id="a11y-text-size"
            class="text-sm font-semibold text-highlighted"
          >{{ t('text_size') }}</span>
          <div
            role="group"
            aria-labelledby="a11y-text-size"
            class="flex items-center gap-2"
          >
            <UButton
              icon="i-lucide-a-arrow-down"
              color="neutral"
              variant="outline"
              :aria-label="t('smaller')"
              :disabled="!canShrink"
              @click="() => { shrink() }"
            />
            <output
              class="w-14 text-center text-sm font-semibold text-highlighted tabular-nums"
              aria-live="polite"
            >{{ textPercent }}%</output>
            <UButton
              icon="i-lucide-a-arrow-up"
              color="neutral"
              variant="outline"
              :aria-label="t('larger')"
              :disabled="!canEnlarge"
              @click="() => { enlarge() }"
            />
          </div>
        </div>

        <!-- One toggle per row, the label in the default slot: the `label`
             prop's slot is `truncate`, and two columns cut the Greek names
             to «Υψηλή αντίθ…», in the one panel where nothing may be lost.
             The slot's text wraps instead, under enlarged text too. -->
        <ul class="flex flex-col gap-2">
          <li
            v-for="item in TOGGLES"
            :key="item.key"
          >
            <UButton
              :icon="item.icon"
              color="neutral"
              variant="outline"
              active-variant="solid"
              :active="preferences[item.key]"
              :aria-pressed="preferences[item.key]"
              block
              class="min-h-12 justify-start text-left"
              @click="() => { toggle(item.key) }"
            >
              {{ t(`toggles.${item.key}`) }}
            </UButton>
          </li>
        </ul>

        <UButton
          icon="i-lucide-rotate-ccw"
          :label="t('reset')"
          color="neutral"
          variant="soft"
          block
          :disabled="isDefault"
          @click="() => { reset() }"
        />
      </div>
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  open: Εργαλεία προσβασιμότητας
  title: Εργαλεία προσβασιμότητας
  description: Προσαρμόστε την εμφάνιση της σελίδας. Οι επιλογές σας θυμούνται σε αυτή τη συσκευή.
  text_size: Μέγεθος κειμένου
  smaller: Μικρότερο κείμενο
  larger: Μεγαλύτερο κείμενο
  reset: Επαναφορά
  toggles:
    contrast: Υψηλή αντίθεση
    grayscale: Αποχρώσεις του γκρι
    links: Υπογράμμιση συνδέσμων
    font: Ευανάγνωστη γραμματοσειρά
    spacing: Αποστάσεις κειμένου
    motion: Παύση κινήσεων
en:
  open: Accessibility tools
  title: Accessibility tools
  description: Adjust how the page looks. Your choices are remembered on this device.
  text_size: Text size
  smaller: Smaller text
  larger: Larger text
  reset: Reset
  toggles:
    contrast: High contrast
    grayscale: Grayscale
    links: Underline links
    font: Readable font
    spacing: Text spacing
    motion: Stop motion
</i18n>
