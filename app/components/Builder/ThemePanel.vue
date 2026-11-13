<script lang="ts" setup>
/**
 * The store's theme, edited in the settings pane: each colour scheme (light
 * and dark) with its colours, then the corners, the page width and the three
 * faces, and the contrast every pair the store's design paints must keep,
 * each rule that fails with a Fix (`fixContrast`). A colour with a scale makes
 * its eleven shades as it is picked; the action colour follows the primary
 * while `actionLinked` is on. Every change goes through the editor store, so it
 * is undone, saved and drawn in the preview like any other.
 *
 * The rules and the labels are the design's (`themeContrastRulesFor`): on
 * Groove Volt the neutral colour paints borders and badges, not text, and
 * only the action and accent colours have rules.
 */
const { t } = useStoreI18n('components/Builder/ThemePanel')
const { contrastRuleLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const tenantStore = useTenantStore()

const design = computed(() => resolveDesign(tenantStore.schemaName))
const document = computed(() => store.theme)
const settings = computed(() => {
  const parsed = zThemeSettings.safeParse(document.value?.copy.draft.settings)
  return parsed.success ? parsed.data : undefined
})
const disabled = computed(() => !store.canEdit)

type Scheme = 'light' | 'dark'
const scheme = ref<Scheme>('light')
const schemes = computed(() => [
  { label: t('scheme.light'), value: 'light' as const, icon: 'i-lucide-sun' },
  { label: t('scheme.dark'), value: 'dark' as const, icon: 'i-lucide-moon' },
])

/** Writes the theme, one undo step per thing edited (`coalesce`). */
function update(next: ThemeSettings, coalesce: string): void {
  const current = document.value
  if (!current) return
  store.change(BUILDER_THEME_DOCUMENT, { ...current.copy, draft: { ...current.copy.draft, settings: next } }, { coalesce: `${BUILDER_THEME_DOCUMENT}/${coalesce}` })
}

function setScheme(name: Scheme, next: ThemeColorScheme, coalesce: string): void {
  if (settings.value) update({ ...settings.value, colors: { ...settings.value.colors, [name]: next } }, `${name}/${coalesce}`)
}

const colours = computed(() => settings.value?.colors[scheme.value])

function pickScale(colour: ThemeScaleColour, value: string): void {
  if (colours.value) setScheme(scheme.value, withScaleColour(colours.value, colour, value, design.value, scheme.value), colour)
}

function pickColour(colour: 'action' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'liked', value: string): void {
  if (colours.value) setScheme(scheme.value, { ...colours.value, [colour]: value }, colour)
}

function setLinked(value: boolean): void {
  if (!colours.value) return
  const next = { ...colours.value, actionLinked: value }
  // Linking again takes the primary's shade at once, as picking the primary would.
  setScheme(scheme.value, value ? withScaleColour(next, 'primary', next.primary.source, design.value, scheme.value) : next, 'actionLinked')
}

function lightToDark(): void {
  if (settings.value) update(withLightAsDark(settings.value), 'dark/all')
}

const SCALE_COLOURS = ['primary', 'secondary', 'neutral'] as const
const SINGLE_COLOURS = ['accent', 'success', 'warning', 'error', 'info', 'liked'] as const

/** What a colour paints, in this design. */
const describe = (colour: string) => t(`describe.${design.value === 'volt' ? 'volt' : 'own'}.${colour}`)

const radiusItems = computed(() => [...RADIUS_ALLOWLIST].map(value => ({ label: value, value })))
const containerItems = computed(() => Object.keys(CONTAINER_MAP).map(value => ({ label: t(`container.${value}`), value })))
const fontItems = computed(() => Object.keys(FONT_ALLOWLIST).map(value => ({ label: FONT_FAMILY_NAMES[value] ?? t(`font.${value}`), value })))

/** Every rule of the design on the theme as it is now. */
const outcomes = computed(() => settings.value ? evaluateContrastRules(settings.value, themeContrastRulesFor(design.value)) : [])

function fix(rule: ContrastRule): void {
  if (settings.value) update(fixContrast(settings.value, rule), `fix/${rule.id}`)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UAlert
      v-if="!document"
      color="neutral"
      variant="subtle"
      icon="i-lucide-palette"
      :title="t('missing.title')"
      :description="t('missing.description')"
    />
    <template v-else-if="settings && colours">
      <section
        class="flex flex-col gap-4"
        :aria-labelledby="'theme-colours'"
      >
        <h3
          id="theme-colours"
          class="text-sm font-semibold text-highlighted"
        >
          {{ t('colours') }}
        </h3>
        <UTabs
          v-model="scheme"
          :items="schemes"
          :content="false"
          size="sm"
        />
        <BuilderThemeColorField
          v-for="colour in SCALE_COLOURS"
          :key="`${scheme}-${colour}`"
          :model-value="colours[colour].source"
          :label="t(`colour.${colour}`)"
          :description="describe(colour)"
          :disabled="disabled"
          @update:model-value="(value) => pickScale(colour, value)"
        />
        <div class="flex flex-col gap-2">
          <BuilderThemeColorField
            :key="`${scheme}-action`"
            :model-value="colours.action"
            :label="t('colour.action')"
            :description="describe('action')"
            :disabled="disabled || colours.actionLinked"
            @update:model-value="(value) => pickColour('action', value)"
          />
          <USwitch
            :model-value="colours.actionLinked"
            :label="t('actionLinked')"
            :disabled="disabled"
            size="sm"
            @update:model-value="setLinked"
          />
        </div>
        <BuilderThemeColorField
          v-for="colour in SINGLE_COLOURS"
          :key="`${scheme}-${colour}`"
          :model-value="colours[colour]"
          :label="t(`colour.${colour}`)"
          :description="describe(colour)"
          :disabled="disabled"
          @update:model-value="(value) => pickColour(colour, value)"
        />
        <UButton
          v-if="scheme === 'dark'"
          icon="i-lucide-copy"
          color="neutral"
          variant="outline"
          size="sm"
          :label="t('lightToDark')"
          :disabled="disabled"
          @click="lightToDark"
        />
      </section>

      <section
        class="flex flex-col gap-4"
        aria-labelledby="theme-shape"
      >
        <h3
          id="theme-shape"
          class="text-sm font-semibold text-highlighted"
        >
          {{ t('shape') }}
        </h3>
        <UFormField :label="t('radius')">
          <USelect
            :model-value="settings.radius"
            :items="radiusItems"
            :disabled="disabled"
            class="w-full"
            @update:model-value="(value) => update({ ...settings!, radius: String(value) }, 'radius')"
          />
        </UFormField>
        <UFormField :label="t('width')">
          <USelect
            :model-value="settings.container"
            :items="containerItems"
            :disabled="disabled"
            class="w-full"
            @update:model-value="(value) => update({ ...settings!, container: String(value) }, 'container')"
          />
        </UFormField>
        <UFormField
          v-for="role in (['sans', 'display', 'mono'] as const)"
          :key="role"
          :label="t(`fonts.${role}`)"
        >
          <USelect
            :model-value="settings.fonts[role]"
            :items="fontItems"
            :disabled="disabled"
            class="w-full"
            @update:model-value="(value) => update({ ...settings!, fonts: { ...settings!.fonts, [role]: String(value) } }, `fonts/${role}`)"
          />
        </UFormField>
      </section>

      <section
        class="flex flex-col gap-2"
        aria-labelledby="theme-contrast"
      >
        <h3
          id="theme-contrast"
          class="text-sm font-semibold text-highlighted"
        >
          {{ t('contrast.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ t('contrast.description') }}
        </p>
        <ul class="flex flex-col divide-y divide-default">
          <li
            v-for="outcome in outcomes"
            :id="`theme-rule-${outcome.rule.id}`"
            :key="outcome.rule.id"
            tabindex="-1"
            class="flex items-center justify-between gap-2 py-2 text-sm"
          >
            <span class="min-w-0">
              {{ contrastRuleLabel(outcome.rule.id) }}
              <span class="text-muted">{{ t('contrast.ratio', { ratio: outcome.ratio.toFixed(2), min: outcome.rule.min }) }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <UBadge
                :color="outcome.pass ? 'success' : outcome.rule.severity === 'error' ? 'error' : 'warning'"
                variant="subtle"
                size="sm"
                :label="outcome.pass ? t('contrast.pass') : outcome.rule.severity === 'error' ? t('contrast.blocks') : t('contrast.warns')"
              />
              <UButton
                v-if="!outcome.pass"
                size="xs"
                color="neutral"
                variant="outline"
                :label="t('contrast.fix')"
                :disabled="disabled"
                @click="() => fix(outcome.rule)"
              />
            </span>
          </li>
        </ul>
      </section>
    </template>
    <UAlert
      v-else
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="t('unreadable')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  missing:
    title: Το θέμα δεν έχει ρυθμιστεί ακόμα
    description: Το κατάστημα αποκτά θέμα όταν μεταφερθεί στον επεξεργαστή.
  unreadable: Το θέμα δεν διαβάζεται.
  colours: Χρώματα
  scheme:
    light: Φωτεινό
    dark: Σκούρο
  colour:
    primary: Κύριο χρώμα
    secondary: Δευτερεύον χρώμα
    neutral: Ουδέτερο χρώμα
    action: Χρώμα κουμπιών
    accent: Χρώμα έμφασης
    success: Επιτυχία
    warning: Προειδοποίηση
    error: Σφάλμα
    info: Πληροφορία
    liked: Αγαπημένα
  describe:
    own:
      primary: Η παλέτα των κουμπιών και των ενεργών στοιχείων.
      secondary: Η παλέτα των δευτερευόντων στοιχείων.
      neutral: Κείμενα, φόντα και περιγράμματα.
      action: Κουμπιά και ενεργά στοιχεία.
      accent: Σύνδεσμοι, εστίαση και δευτερεύοντα κουμπιά.
      success: Μηνύματα επιτυχίας.
      warning: Μηνύματα προσοχής.
      error: Σφάλματα και διαγραφές.
      info: Ενημερώσεις.
      liked: Η καρδιά των αγαπημένων.
    volt:
      primary: Η παλέτα των κύριων στοιχείων.
      secondary: Η παλέτα των δευτερευόντων στοιχείων.
      neutral: Περιγράμματα και ετικέτες. Τα κείμενα και τα φόντα είναι του σχεδίου.
      action: Κουμπιά και ενεργά στοιχεία.
      accent: Σύνδεσμοι, εστίαση και δευτερεύοντα κουμπιά.
      success: Μηνύματα επιτυχίας.
      warning: Μηνύματα προσοχής.
      error: Σφάλματα και διαγραφές.
      info: Ενημερώσεις.
      liked: Η καρδιά των αγαπημένων.
  actionLinked: Ακολουθεί το κύριο χρώμα
  lightToDark: Ίδια χρώματα με το φωτεινό
  shape: Σχήμα και γραμματοσειρές
  radius: Γωνίες
  width: Πλάτος σελίδας
  container:
    narrow: Στενό
    default: Κανονικό
    comfortable: Άνετο
    wide: Φαρδύ
  fonts:
    sans: Γραμματοσειρά κειμένου
    display: Γραμματοσειρά τίτλων
    mono: Γραμματοσειρά αριθμών
  font:
    system: Του συστήματος
    system-mono: Του συστήματος, σταθερού πλάτους
  contrast:
    title: Αντίθεση
    description: Πόσο ξεχωρίζουν τα χρώματα από το φόντο, κατά WCAG 2.2.
    ratio: "{ratio}:1, χρειάζεται {min}:1"
    pass: Εντάξει
    blocks: Εμποδίζει τη δημοσίευση
    warns: Χαμηλή
    fix: Διόρθωση
en:
  missing:
    title: The theme is not set up yet
    description: The store gets its theme when it moves onto the editor.
  unreadable: The theme cannot be read.
  colours: Colours
  scheme:
    light: Light
    dark: Dark
  colour:
    primary: Primary colour
    secondary: Secondary colour
    neutral: Neutral colour
    action: Button colour
    accent: Accent colour
    success: Success
    warning: Warning
    error: Error
    info: Info
    liked: Liked
  describe:
    own:
      primary: The palette of buttons and active elements.
      secondary: The palette of secondary elements.
      neutral: Text, backgrounds and borders.
      action: Buttons and active elements.
      accent: Links, focus rings and secondary buttons.
      success: Success messages.
      warning: Warnings.
      error: Errors and deletions.
      info: Notices.
      liked: The heart of favourites.
    volt:
      primary: The palette of main elements.
      secondary: The palette of secondary elements.
      neutral: Borders and badges. Text and backgrounds are the design's own.
      action: Buttons and active elements.
      accent: Links, focus rings and secondary buttons.
      success: Success messages.
      warning: Warnings.
      error: Errors and deletions.
      info: Notices.
      liked: The heart of favourites.
  actionLinked: Follows the primary colour
  lightToDark: Same colours as light
  shape: Shape and fonts
  radius: Corners
  width: Page width
  container:
    narrow: Narrow
    default: Standard
    comfortable: Comfortable
    wide: Wide
  fonts:
    sans: Text font
    display: Heading font
    mono: Numbers font
  font:
    system: The system's
    system-mono: The system's, fixed width
  contrast:
    title: Contrast
    description: How far the colours stand out from the background, by WCAG 2.2.
    ratio: "{ratio}:1, needs {min}:1"
    pass: OK
    blocks: Blocks publishing
    warns: Low
    fix: Fix
</i18n>
