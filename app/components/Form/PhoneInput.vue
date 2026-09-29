<script lang="ts" setup>
import type { SelectMenuItem } from '@nuxt/ui'

type PhoneCountryItem = {
  label: string
  value: string
  dialCode: string
  /** What the picker's search matches besides the name. */
  searchTerms: string
}

const props = withDefaults(defineProps<{
  label: string
  name: string
  required?: boolean
  /**
   * The form's own (delivery) country, alpha-2. The picker FOLLOWS it
   * until the shopper picks a phone country of their own — a Greek
   * mobile can receive a parcel in Cyprus, so the two are separate.
   */
  followCountry?: string | null
  /** alpha-2 codes listed first, divided from the rest (the store's shippable countries). */
  pinnedCountries?: readonly string[]
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  followCountry: null,
  pinnedCountries: () => [],
  size: 'md',
})

/** The number as submitted: E.164 (``+35796123456``), or ``''`` while empty. */
const modelValue = defineModel<string>({ default: '' })
/**
 * The phone country the shopper chose (alpha-2); empty while the picker
 * follows ``followCountry``. Sticky once set. Also what validation reads.
 */
const pickedCountry = defineModel<string | undefined>('country')

const { t, locale } = useI18n()
const { data } = usePhoneCountries()
const pickerId = useId()

// The national digits as typed. Shallow so ``triggerRef`` can re-render the
// input when a stripped ``+code`` leaves this string unchanged. Starts as the
// model itself: a saved number is parsed once the country list is here.
const national = shallowRef(modelValue.value)

const named = computed(() => (data.value?.results ?? [])
  .filter(country => country.phoneCode != null)
  .map(country => ({
    country,
    label: extractTranslated(country, 'name', locale.value) ?? country.alpha2,
  })))

// The store's shippable countries first (in the order given), then the
// rest A–Z by localized name. Shared dial codes resolve to the first here.
// Keyed by a string: a caller passing a fresh array on every render (an
// inline `.map()`) must not re-order ~250 rows, rebuild the items, or wake
// anything that watches them.
const pinnedKey = computed(() => props.pinnedCountries.join(','))
const ordered = computed(() => {
  const pinnedCodes = pinnedKey.value ? pinnedKey.value.split(',') : []
  const pinned = pinnedCodes
    .map(alpha2 => named.value.find(entry => entry.country.alpha2 === alpha2))
    .filter(entry => entry !== undefined)
  const rest = named.value
    .filter(entry => !pinnedCodes.includes(entry.country.alpha2))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value))
  return { pinned, rest }
})
const countries = computed(() => [...ordered.value.pinned, ...ordered.value.rest].map(entry => entry.country))

const country = computed(() => resolvePhoneCountry(
  countries.value,
  pickedCountry.value || props.followCountry,
  { fallbackToFirst: true },
))
const countryName = computed(() =>
  named.value.find(entry => entry.country.alpha2 === country.value?.alpha2)?.label ?? '')
const dialCode = computed(() => dialCodeLabel(country.value))
const e164 = computed(() => normalizePhone(national.value, country.value))

const searchTerm = ref('')

// The pinned group ends with a divider drawn by the last pinned row itself,
// not a `{ type: 'separator' }` item: the menu is virtualized, and every row
// is placed at an estimated fixed height, so a separator item (~9px) was
// given a full row's slot and left a row-sized gap under the pinned
// countries. A pseudo-element has no layout height. Only while the search is
// empty — a filtered list has no pinned group to divide.
const PINNED_DIVIDER = 'after:absolute after:inset-x-1 after:bottom-0 after:h-px after:bg-border'

const items = computed<SelectMenuItem[]>(() => {
  const toItem = ({ country, label }: { country: Country, label: string }): PhoneCountryItem => {
    const code = dialCodeLabel(country)
    return { label, value: country.alpha2, dialCode: code, searchTerms: `${code} ${country.alpha2}` }
  }
  const { pinned, rest } = ordered.value
  const divide = pinned.length > 0 && rest.length > 0 && !searchTerm.value
  return [
    ...pinned.map((entry, index) => ({
      ...toItem(entry),
      ...(divide && index === pinned.length - 1 ? { class: PINNED_DIVIDER } : {}),
    })),
    ...rest.map(toItem),
  ]
})

// Typing, pasting or browser autofill of ``+<code>…`` / ``00<code>…``: the
// code names the country, so it becomes the (sticky) pick and only the
// national digits stay in the input.
function onInput(raw: string) {
  const detected = detectPhoneCountry(raw, countries.value, country.value?.alpha2)
  if (detected) {
    pickedCountry.value = detected.country.alpha2
  }
  // A space typed after the code ("+357 9612…") must not become the first
  // character of the number: the dial code is shown next to the input.
  national.value = (detected?.national ?? raw).trimStart()
  triggerRef(national)
}

// Changing the picker keeps the digits: only the dial code in front changes.
function pick(alpha2: string) {
  pickedCountry.value = alpha2
}

// Inbound: an E.164 value written from OUTSIDE (a saved address, a reset).
// Its country is a choice only when it differs from the one being followed.
function hydrate(value: string) {
  const detected = detectPhoneCountry(value, countries.value, country.value?.alpha2)
  if (!detected) {
    national.value = value
    return
  }
  if (detected.country.alpha2 !== props.followCountry || pickedCountry.value) {
    pickedCountry.value = detected.country.alpha2
  }
  national.value = detected.national
  triggerRef(national)
}

// The last E.164 this component wrote. The model changing to that is our own
// output coming back, not news: reading it as an external write re-parsed the
// OLD number against the NEW follow country and made the picker sticky
// (and, re-rendering the parent, looped).
let lastEmitted = modelValue.value

watch(modelValue, (value) => {
  if (value !== lastEmitted) hydrate(value)
})

// The list arriving (once) is what lets a saved number, or a ``+code`` typed
// before it, name its country. Its identity is not watched: only its size.
watch(() => countries.value.length, (size, previous) => {
  if (size && !previous) hydrate(modelValue.value)
}, { immediate: true })

// Outbound: the ONE place the E.164 value is produced.
watch(e164, (value) => {
  lastEmitted = value
  if (value !== modelValue.value) modelValue.value = value
})
</script>

<template>
  <UFormField :label="label" :name="name" :required="required">
    <UFieldGroup :size="size" class="w-full">
      <USelectMenu
        :id="pickerId"
        v-model:search-term="searchTerm"
        :model-value="country?.alpha2"
        :items="items"
        value-key="value"
        :filter-fields="['label', 'searchTerms']"
        :search-input="{ placeholder: t('search_placeholder'), icon: 'i-lucide:search' }"
        virtualize
        :aria-label="t('country_label', { country: countryName, code: dialCode })"
        :content="{ align: 'start' }"
        :ui="{ base: 'w-auto shrink-0 pe-8',
               content: `w-72 max-w-[calc(100vw-2rem)]`,
               placeholder: `hidden` }"
        @update:model-value="(value) => pick(String(value))"
      >
        <FormCountryFlag v-if="country" :alpha2="country.alpha2" />

        <template #item-leading="{ item }">
          <FormCountryFlag :alpha2="(item as PhoneCountryItem).value" />
        </template>

        <template #item-label="{ item }">
          <span class="truncate">{{ (item as PhoneCountryItem).label }}</span>
          <span class="ms-2 text-muted">{{ (item as PhoneCountryItem).dialCode }}</span>
        </template>

        <template #empty>
          {{ t('no_results') }}
        </template>
      </USelectMenu>

      <!--
        The dial code is fixed text in the input's own leading slot, and the
        start padding is sized to ITS length in `ch` (the pattern of Nuxt UI's
        phone-number example), so `+30`, `+357` and `+1264` can never overlap
        the digits. The slot text starts one start-inset (0.75rem, ~1.5ch) in
        from the edge, so 1.5ch of padding beyond the code leaves NO gap; the
        extra 1ch is the gap between the code and the digits.
      -->
      <UInput
        :model-value="national"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        :placeholder="country?.phoneMetadata?.exampleMobile ?? ''"
        :style="{ '--dial-code-length': `${dialCode.length + 2.5}ch` }"
        class="w-full"
        :ui="{ base: 'ps-(--dial-code-length)', leading: `
          pointer-events-none text-base text-muted
          md:text-sm
        ` }"
        @update:model-value="(value) => onInput(String(value ?? ''))"
      >
        <template v-if="dialCode" #leading>
          {{ dialCode }}
        </template>
      </UInput>
    </UFieldGroup>
  </UFormField>
</template>

<i18n lang="yaml">
el:
  country_label: "Κωδικός χώρας τηλεφώνου: {country} ({code})"
  search_placeholder: Αναζήτηση χώρας ή κωδικού
  no_results: Δεν βρέθηκε χώρα
en:
  country_label: "Phone country code: {country} ({code})"
  search_placeholder: Search country or code
  no_results: No country found
</i18n>
