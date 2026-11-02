<script lang="ts" setup>
const props = defineProps<{
  /** The kinds of record it offers, in the order the results are grouped. */
  kinds: readonly LinkRefKind[]
  /** The record chosen, or none. */
  value: BuilderLinkRef | undefined
  /** The setting's name, for the control's accessible name. */
  label: string
  /** Whether the choice may be cleared: a setting that may be left empty. */
  clearable: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  update: [value: BuilderLinkRef | undefined]
}>()

const { t } = useStoreI18n('components/Builder/RecordPicker')

/** One record among the choices, as `USelectMenu` takes it. */
interface RecordItem {
  /** `<kind>:<id>` (`builderRecordKey`). */
  value: string
  label: string
  description?: string
  ref: BuilderLinkRef
}

const searchTerm = ref('')
const query = refDebounced(computed(() => searchTerm.value.trim()), BUILDER_LINK_SEARCH_DELAY_MS)

// Django answers a term shorter than its minimum with no results, so the
// picker asks once something is typed and leaves the rest to it.
const { data: found, status: searchStatus } = useLazyApi('/api/builder/link-search', {
  query: computed(() => ({ q: query.value, kinds: props.kinds.join(',') })),
  enabled: computed(() => query.value !== ''),
})

// The chosen record's name: a stored link holds only its kind and id.
const { data: labels, status: labelStatus } = useLazyApi('/api/builder/link-labels', {
  query: computed(() => props.value ? builderRecordLabelsQuery(props.value) : {}),
  enabled: computed(() => props.value !== undefined),
})

const current = computed(() => props.value ? builderRecordLabel(labels.value ?? undefined, props.value) : undefined)

/** The chosen record as the menu shows it: by its name once known, by its kind and id until then. */
const selected = computed<RecordItem | undefined>(() => {
  const ref = props.value
  if (!ref) return undefined
  return { value: builderRecordKey(ref), label: current.value?.label ?? t(`record.${ref.kind}`, { id: ref.id }), ref }
})

/** Whether the chosen record can no longer be linked (unpublished, inactive or gone): it is dropped from the page when published. */
const unavailable = computed(() => labelStatus.value === 'success' && props.value !== undefined && current.value?.active !== true)

const items = computed(() => builderRecordGroups(found.value?.results ?? []).map(({ kind, results }) => [
  { type: 'label' as const, label: t(`kinds.${kind}`) },
  ...results.flatMap((result): RecordItem[] => {
    const ref = builderLinkRefOf(result.kind, result.id)
    return ref ? [{ value: builderRecordKey(ref), label: result.label ?? result.slug, description: result.slug, ref }] : []
  }),
]))

/**
 * The record picked, as a plain value: the menu hands back its item through
 * Vue's reactivity, and a proxy cannot be cloned into the working copy.
 */
function choose(item: RecordItem | null | undefined): void {
  emit('update', item ? builderLinkRefOf(item.ref.kind, item.ref.id) : undefined)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <USelectMenu
      v-model:search-term="searchTerm"
      :model-value="selected"
      :items="items"
      by="value"
      ignore-filter
      :clear="clearable"
      :loading="searchStatus === 'pending' || labelStatus === 'pending'"
      :placeholder="t('placeholder')"
      :search-input="{ placeholder: t('search') }"
      :aria-label="label"
      :disabled="disabled"
      class="w-full"
      @update:model-value="choose"
    >
      <template #empty="{ searchTerm: term }">
        {{ term.trim() === '' ? t('typeToSearch') : t('noResults') }}
      </template>
    </USelectMenu>
    <p
      v-if="unavailable"
      class="flex items-center gap-1 text-xs text-warning"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="size-3.5 shrink-0"
      />
      {{ t('unavailable') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  placeholder: Επιλέξτε…
  search: Αναζήτηση με όνομα ή διεύθυνση
  typeToSearch: Πληκτρολογήστε για αναζήτηση.
  noResults: Δεν βρέθηκε τίποτα.
  unavailable: Δεν είναι πια διαθέσιμο· θα παραλειφθεί στη δημοσίευση.
  kinds:
    product: Προϊόντα
    category: Κατηγορίες
    blogPost: Άρθρα
    blogCategory: Κατηγορίες ιστολογίου
    page: Σελίδες
    contentPage: Σελίδες περιεχομένου
  record:
    product: "Προϊόν #{id}"
    category: "Κατηγορία #{id}"
    blogPost: "Άρθρο #{id}"
    blogCategory: "Κατηγορία ιστολογίου #{id}"
    page: "Σελίδα «{id}»"
    contentPage: "Σελίδα περιεχομένου «{id}»"
en:
  placeholder: Choose…
  search: Search by name or address
  typeToSearch: Type to search.
  noResults: Nothing found.
  unavailable: No longer available; it is left out when published.
  kinds:
    product: Products
    category: Categories
    blogPost: Blog posts
    blogCategory: Blog categories
    page: Pages
    contentPage: Content pages
  record:
    product: "Product #{id}"
    category: "Category #{id}"
    blogPost: "Blog post #{id}"
    blogCategory: "Blog category #{id}"
    page: "Page “{id}”"
    contentPage: "Content page “{id}”"
</i18n>
