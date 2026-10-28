<script lang="ts" setup>
/**
 * The row of category chips under a listing's title: where a shopper
 * can go from here, one tap each.
 *
 * A category with subcategories lists them after an "all of it" chip
 * for the page itself. A category without any lists its siblings, so
 * the row still leads somewhere — and the first chip goes back up to
 * the parent. The store-wide listing lists the top-level categories.
 *
 * On a category page a "back" chip comes first: one level up, to the
 * parent category or, from a top-level one, to all products. The filter
 * tree that also leads back lives in the drawer on a phone, so this is
 * the quick way.
 */
const { t } = useStoreI18n('components/Products/CategoryChips')
const localePath = useLocalePath()
const { forest, trail } = useCategoryForest()

interface Chip {
  key: string
  label: string
  count: number | null
  to: string
  current: boolean
}

// Only where no chip of the row already leads there: a category without
// subcategories lists its siblings after a chip for the parent.
const back = computed(() => {
  if (!trail.value.length) return null
  const parent = trail.value.at(-2)
  const destination = parent
    ? { label: parent.label, to: parent.to }
    : { label: t('all_products'), to: '/products' }
  return chips.value.some(chip => chip.to === destination.to) ? null : destination
})

const chips = computed<Chip[]>(() => {
  const current = trail.value.at(-1)
  const scope = current?.children.length ? current : trail.value.at(-2)
  const options = scope ? scope.children : forest.value
  if (!options.length) return []

  const all: Chip = scope
    ? {
        key: 'all',
        label: t('all_in', { name: scope.label }),
        count: scope.count,
        to: scope.to,
        current: scope.id === current?.id,
      }
    : {
        key: 'all',
        label: t('all_products'),
        count: options.every(node => node.count === null)
          ? null
          : options.reduce((sum, node) => sum + (node.count ?? 0), 0),
        to: '/products',
        current: current === undefined,
      }

  return [all, ...options.map(node => ({
    key: String(node.id),
    label: node.label,
    count: node.count,
    to: node.to,
    current: node.id === current?.id,
  }))]
})
</script>

<template>
  <nav
    v-if="chips.length"
    :aria-label="t('label')"
  >
    <!-- One row that scrolls sideways on a phone, bleeding to the screen
         edge; wrapped lines on a wide screen. -->
    <ul
      class="
        -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]
        sm:-mx-6 sm:px-6
        lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0
      "
    >
      <li
        v-if="back"
        class="shrink-0"
      >
        <UButton
          :to="localePath(pathLocation(back.to))"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-left"
          :aria-label="t('back_to', { name: back.label })"
          size="sm"
        >
          {{ back.label }}
        </UButton>
      </li>
      <li
        v-for="chip in chips"
        :key="chip.key"
        class="shrink-0"
      >
        <UButton
          :to="localePath(pathLocation(chip.to))"
          :color="chip.current ? 'primary' : 'neutral'"
          :variant="chip.current ? 'solid' : 'outline'"
          :aria-current="chip.current ? 'page' : undefined"
          size="sm"
        >
          {{ chip.label }}
          <span
            v-if="chip.count !== null"
            class="font-mono text-xs opacity-70"
          >
            {{ chip.count }}
          </span>
        </UButton>
      </li>
    </ul>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Κατηγορίες
  all_products: Όλα τα προϊόντα
  all_in: Όλη η κατηγορία
  back_to: 'Πίσω στο «{name}»'
en:
  label: Categories
  all_products: All products
  all_in: All {name}
  back_to: 'Back to {name}'
</i18n>
