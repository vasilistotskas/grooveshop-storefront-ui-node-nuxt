<script lang="ts" setup>
import type { SelectItem } from '@nuxt/ui'

const props = defineProps<{
  /** The setting: its source and the most records it may list. */
  field: Extract<BuilderSettingField, { kind: 'query' }>
  /** The descriptor stored, or none yet. */
  value: unknown
  /** The setting's name, for the controls' accessible names. */
  label: string
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The whole descriptor, which is closed: a key left out is a key the list does not have. */
  update: [descriptor: BuilderQueryDescriptor]
}>()

const { t } = useStoreI18n('components/Builder/QueryField')

const UNSET = '@unset'

const descriptor = computed<BuilderQueryDescriptor | undefined>(() =>
  typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value) ? props.value as BuilderQueryDescriptor : undefined)
const modes = computed<readonly string[]>(() => BUILDER_QUERY_MODES[props.field.source])
const mode = computed(() => typeof descriptor.value?.mode === 'string' ? descriptor.value.mode : undefined)

const modeItems = computed(() => modes.value.map(value => ({ value, label: t(`mode.${props.field.source}.${value}`) })))

/** The products and posts a rule orders by, and the ways it may. */
const orderingItems = computed<SelectItem[]>(() =>
  (props.field.source === 'product' ? PRODUCT_ORDERINGS : BLOG_POST_ORDERINGS).map(value => ({ value, label: t(`ordering.${value}`) })))

/** The stock choices; "as they come" is the absence of the key, so an untouched list and a reset one are the same document. */
const stockItems = computed(() => PRODUCT_STOCK_MODES.map(value => ({ value, label: t(`stock.${value}`) })))
const stock = computed(() => PRODUCT_STOCK_MODES.find(mode => mode === descriptor.value?.stock) ?? 'any')

const limit = computed(() => typeof descriptor.value?.limit === 'number' ? descriptor.value.limit : undefined)
const ordering = computed(() => typeof descriptor.value?.ordering === 'string' ? descriptor.value.ordering : undefined)
const featured = computed(() => descriptor.value?.featured === true ? 'on' : descriptor.value?.featured === false ? 'off' : UNSET)
const featuredItems = computed(() => [
  { label: t('featured.any'), value: UNSET },
  { label: t('featured.only'), value: 'on' },
  { label: t('featured.not'), value: 'off' },
])

const categories = computed(() => builderQueryIds(descriptor.value, 'categories'))
const pickedIds = computed(() => builderQueryIds(descriptor.value, 'ids'))
const blogCategory = computed(() => typeof descriptor.value?.category === 'number' ? { kind: 'blogCategory' as const, id: descriptor.value.category } : undefined)
const parent = computed(() => typeof descriptor.value?.parent === 'number' ? { kind: 'category' as const, id: descriptor.value.parent } : undefined)

function patch(changes: BuilderQueryDescriptor): void {
  emit('update', builderQueryPatch(descriptor.value, changes))
}

function setMode(next: unknown): void {
  if (typeof next === 'string') emit('update', builderQueryDefault(props.field.source, next, props.field.maxLimit))
}

function setFeatured(next: unknown): void {
  patch({ featured: next === 'on' ? true : next === 'off' ? false : undefined })
}

function setOrdering(next: unknown): void {
  if (typeof next === 'string') patch({ ordering: next })
}

function setStock(next: unknown): void {
  if (typeof next === 'string') patch({ stock: next === 'any' ? undefined : next })
}

function setLimit(next: number | null | undefined): void {
  patch({ limit: next ?? undefined })
}

/** A set of ids, taken out of the descriptor when it is empty: a filter that names nothing does not exist. */
function setCategories(ids: number[]): void {
  patch({ categories: ids.length > 0 ? ids : undefined })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <URadioGroup
      v-if="modeItems.length"
      :model-value="mode"
      :items="modeItems"
      orientation="horizontal"
      variant="table"
      indicator="hidden"
      size="sm"
      :disabled="disabled"
      :aria-label="label"
      @update:model-value="setMode"
    />
    <p
      v-if="!descriptor && modes.length"
      class="text-xs text-muted"
    >
      {{ t('unset') }}
    </p>

    <!-- A hand-picked list: the merchant's own records, in the merchant's order. -->
    <UFormField
      v-if="mode === 'picked'"
      :label="t('picked')"
      :help="t('pickedHelp')"
    >
      <BuilderRecordList
        :kind="field.source === 'product' ? 'product' : 'blogPost'"
        :ids="pickedIds"
        :max="DATA_LIMITS.maxPickedIds"
        ordered
        :label="t('picked')"
        :disabled="disabled"
        @update="(ids: number[]) => patch({ ids })"
      />
    </UFormField>

    <!-- A rule: the records that match it now, whichever they are. -->
    <template v-else-if="mode === 'filter'">
      <UFormField
        v-if="field.source === 'product'"
        :label="t('categories')"
        :help="t('categoriesHelp')"
      >
        <BuilderRecordList
          kind="category"
          :ids="categories"
          :max="DATA_LIMITS.maxFilterIds"
          :ordered="false"
          :label="t('categories')"
          :disabled="disabled"
          @update="setCategories"
        />
      </UFormField>
      <template v-else>
        <UFormField :label="t('blogCategory')">
          <BuilderRecordPicker
            :kinds="['blogCategory']"
            :value="blogCategory"
            :label="t('blogCategory')"
            clearable
            :disabled="disabled"
            @update="(next: BuilderLinkRef | undefined) => patch({ category: next?.id })"
          />
        </UFormField>
        <UFormField :label="t('featured.label')">
          <URadioGroup
            :model-value="featured"
            :items="featuredItems"
            orientation="horizontal"
            variant="table"
            indicator="hidden"
            size="sm"
            :disabled="disabled"
            @update:model-value="setFeatured"
          />
        </UFormField>
      </template>
      <UFormField :label="t('ordering.label')">
        <USelect
          :model-value="ordering"
          :items="orderingItems"
          :disabled="disabled"
          class="w-full"
          @update:model-value="setOrdering"
        />
      </UFormField>
      <UFormField
        v-if="field.source === 'product'"
        :label="t('stock.label')"
      >
        <USelect
          :model-value="stock"
          :items="stockItems"
          :disabled="disabled"
          class="w-full"
          @update:model-value="setStock"
        />
      </UFormField>
    </template>

    <!-- The children of one category. -->
    <UFormField
      v-else-if="mode === 'children'"
      :label="t('parent')"
    >
      <BuilderRecordPicker
        :kinds="['category']"
        :value="parent"
        :label="t('parent')"
        :clearable="false"
        :disabled="disabled"
        @update="(next: BuilderLinkRef | undefined) => patch({ parent: next?.id })"
      />
    </UFormField>

    <UFormField
      v-if="mode !== 'picked' && (descriptor || !modes.length)"
      :label="t('limit')"
      :help="t('limitHelp', { max: field.maxLimit })"
    >
      <UInputNumber
        :model-value="limit"
        :min="1"
        :max="field.maxLimit"
        :step="1"
        :disabled="disabled"
        class="w-full"
        @update:model-value="setLimit"
      />
    </UFormField>
  </div>
</template>

<i18n lang="yaml">
el:
  unset: Επιλέξτε πώς θα βρίσκονται τα στοιχεία.
  mode:
    product:
      filter: Με κανόνα
      picked: Επιλεγμένα
    blogPost:
      filter: Με κανόνα
      picked: Επιλεγμένα
    category:
      roots: Κύριες κατηγορίες
      children: Υποκατηγορίες
  picked: Στοιχεία
  pickedHelp: Εμφανίζονται με τη σειρά που τα βάζετε.
  categories: Κατηγορίες
  categoriesHelp: Όλες αν δεν επιλέξετε καμία· οι υποκατηγορίες περιλαμβάνονται.
  blogCategory: Κατηγορία
  parent: Μητρική κατηγορία
  featured:
    label: Προτεινόμενα
    any: Όλα
    only: Μόνο προτεινόμενα
    not: Χωρίς προτεινόμενα
  ordering:
    label: Σειρά
    newest: Τα νεότερα
    mostViewed: Τα πιο δημοφιλή
    mostLiked: Τα πιο αγαπημένα
    topRated: Τα πιο καλά αξιολογημένα
    discounted: Με τη μεγαλύτερη έκπτωση
    priceAsc: Τιμή, από τη χαμηλότερη
    priceDesc: Τιμή, από την υψηλότερη
  stock:
    label: Απόθεμα
    any: Όπως έρχονται
    inStockFirst: Πρώτα τα διαθέσιμα
    inStockOnly: Μόνο τα διαθέσιμα
  limit: Πόσα
  limitHelp: "Έως {max}."
en:
  unset: Choose how the items are found.
  mode:
    product:
      filter: By a rule
      picked: Hand-picked
    blogPost:
      filter: By a rule
      picked: Hand-picked
    category:
      roots: Main categories
      children: Subcategories
  picked: Items
  pickedHelp: They are shown in the order you put them.
  categories: Categories
  categoriesHelp: All of them if you choose none; subcategories are included.
  blogCategory: Category
  parent: Parent category
  featured:
    label: Featured
    any: All
    only: Featured only
    not: Not featured
  ordering:
    label: Order
    newest: Newest
    mostViewed: Most viewed
    mostLiked: Most liked
    topRated: Best rated
    discounted: Biggest discount
    priceAsc: Price, lowest first
    priceDesc: Price, highest first
  stock:
    label: Stock
    any: As they come
    inStockFirst: In stock first
    inStockOnly: In stock only
  limit: How many
  limitHelp: "Up to {max}."
</i18n>
