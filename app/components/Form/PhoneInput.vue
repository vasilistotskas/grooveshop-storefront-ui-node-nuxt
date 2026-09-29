<script lang="ts" setup>
const props = withDefaults(defineProps<{
  label: string
  name: string
  required?: boolean
  /**
   * The form's own country (alpha-2): what a number typed WITHOUT a
   * ``+code`` / ``00code`` is read against, and whose example is the
   * placeholder.
   */
  country?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  country: null,
  size: 'md',
})

// Exactly what the shopper typed. It is turned into E.164 where it is
// validated and submitted (``normalizePhone``), never rewritten here.
const modelValue = defineModel<string>()

const { t, locale } = useI18n()
const { data } = usePhoneCountries()

const formCountry = computed(() => resolvePhoneCountry(data.value?.results, props.country))

// The country the typed number resolves to. Every dial code is known, not
// only the shippable countries, so a foreign number is recognised too.
const resolved = computed(() => modelValue.value?.trim()
  ? resolveTypedPhoneCountry(modelValue.value, data.value?.results, formCountry.value)
  : undefined)
const resolvedName = computed(() =>
  extractTranslated(resolved.value, 'name', locale.value) ?? resolved.value?.alpha2)
</script>

<template>
  <UFormField :label="label" :name="name" :required="required" :help="t('hint')">
    <!--
      `pe-28` reserves the badge's room in the input's own end padding
      (Nuxt UI's `trailing` variant only reserves `pe-9`…`pe-11`, one icon), so
      the text stops before the badge: flag 1.25rem + gap + the widest
      dial code (`+1264`, ~3rem) + the end inset fit in 7rem. The badge
      is absolutely positioned by the slot, so it can never push or
      cover what is typed.
    -->
    <UInput
      v-model="modelValue"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      :size="size"
      :placeholder="formCountry?.phoneMetadata?.exampleMobile ?? ''"
      class="w-full"
      :ui="{ base: resolved ? 'pe-28' : '', trailing: 'pointer-events-none' }"
    >
      <template v-if="resolved" #trailing>
        <span class="flex items-center gap-1.5 text-sm font-medium text-muted">
          <FormCountryFlag :alpha2="resolved.alpha2" />
          <span aria-hidden="true">{{ dialCodeLabel(resolved) }}</span>
          <span class="sr-only">{{ t('recognised', { country: resolvedName, code: dialCodeLabel(resolved) }) }}</span>
        </span>
      </template>
    </UInput>
  </UFormField>
</template>

<i18n lang="yaml">
el:
  hint: Για αριθμό άλλης χώρας, ξεκινήστε με τον κωδικό της (π.χ. +30).
  recognised: "Αναγνωρίστηκε: {country} ({code})"
en:
  hint: For a number from another country, start with its code (e.g. +30).
  recognised: "Recognised: {country} ({code})"
</i18n>
