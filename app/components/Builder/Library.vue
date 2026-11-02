<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Library')
const { blockLabel, categoryLabel, featureLabel } = useBuilderLabels()
const library = useBuilderLibraryStore()
const store = useBuilderEditorStore()
const tenantStore = useTenantStore()
const { select } = useBuilderEditorView()
// On a phone the library takes the whole screen: a centred dialog taller than the screen clips its own title.
const { isMobile } = useDevice()

const ALL = 'all'

/** The tabs scroll sideways on a narrow screen, from the first, instead of squeezing their names. */
const TABS_UI = { root: 'shrink-0 items-start overflow-x-auto', list: 'w-max', trigger: 'shrink-0' }

const open = computed({
  get: () => library.target !== null,
  set: (value) => {
    if (!value) library.close()
  },
})

/** The node the new block goes into, when the library adds a block rather than a section. */
const parent = computed(() => {
  const target = library.target
  const document = target && store.opened[target.documentKey]
  return target?.parentId !== undefined && document ? findBuilderNode(document.copy.draft, target.parentId) : undefined
})

const offers = computed(() => {
  const target = library.target
  const document = target && store.opened[target.documentKey]
  if (!target || !document) return []
  return builderLibraryOffers(document.copy, target.documentKey, { parentId: target.parentId }, builderEditorBlocks, feature => storeFeatureOn(tenantStore.config, feature))
})

const category = ref<string>(ALL)
const query = ref('')
watch(() => library.target, () => {
  category.value = ALL
  query.value = ''
})

/** The tabs: every section first, then each category that offers one, in the library's order. Blocks inside a section have none. */
const tabs = computed(() => parent.value
  ? []
  : [
      { label: t('all'), value: ALL },
      ...BUILDER_BLOCK_CATEGORIES
        .filter(name => offers.value.some(({ definition }) => definition.editor.category === name))
        .map(name => ({ label: categoryLabel(name), value: name })),
    ])

/** A name as search compares it: lower case, without accents, so «σελιδα» finds «Σελίδα». */
const searchable = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()

const shown = computed(() => {
  const words = searchable(query.value.trim())
  const rank = (offer: BuilderLibraryOffer) => offer.definition.editor.category ? BUILDER_BLOCK_CATEGORIES.indexOf(offer.definition.editor.category) : 0
  return offers.value
    .filter(({ definition }) =>
      (category.value === ALL || definition.editor.category === category.value)
      && (!words || searchable(blockLabel(definition.type)).includes(words)))
    .toSorted((a, b) => rank(a) - rank(b) || blockLabel(a.definition.type).localeCompare(blockLabel(b.definition.type)))
})

function refusalText(offer: BuilderLibraryOffer): string | undefined {
  switch (offer.refusal) {
    case 'feature': return t('refusal.feature', { feature: featureLabel(offer.definition.feature!) })
    case 'perTemplate': return t('refusal.perTemplate', { count: offer.definition.limits.maxPerTemplate })
    case 'full': return t('refusal.full', { count: parent.value ? builderEditorBlocks.get(builderBlockType(parent.value))?.limits.maxBlocks : 0 })
    default: return undefined
  }
}

async function add(offer: BuilderLibraryOffer): Promise<void> {
  const target = library.target
  const document = target && store.opened[target.documentKey]
  if (!target || !document || offer.refusal || !store.canEdit) return
  const id = crypto.randomUUID()
  const node = builderPresetNode(offer.definition, BUILDER_DEFAULT_PRESET, builderEditorBlocks, builderPresetText, () => crypto.randomUUID())
  store.change(target.documentKey, insertNode(document.copy, target, id, node))
  library.close()
  await select(builderNodeRef(target.documentKey, id))
}

const grid = useTemplateRef<HTMLElement>('grid')

/**
 * The arrow keys move through the cards as they are laid out: left and
 * right to the neighbour, up and down to the card above or below, however
 * many columns the dialog's width gives.
 */
function moveFocus(event: KeyboardEvent): void {
  const cards = [...(grid.value?.querySelectorAll<HTMLElement>('[data-library-card]') ?? [])]
  const from = cards.indexOf(document.activeElement as HTMLElement)
  if (from < 0) return
  const columns = cards.filter(card => card.offsetTop === cards[0]!.offsetTop).length
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, Home: -from, End: cards.length - 1 - from }[event.key]
  if (step === undefined) return
  event.preventDefault()
  cards[Math.min(Math.max(from + step, 0), cards.length - 1)]!.focus()
}
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="parent ? t('titleBlock', { name: blockLabel(builderBlockType(parent)) }) : t('titleSection')"
    :description="t('description')"
    :ui="{ content: 'sm:max-w-3xl', header: 'pe-12', body: 'flex flex-col gap-4' }"
  >
    <template #body>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="t('search')"
        :aria-label="t('search')"
        autofocus
        class="w-full"
      />
      <UTabs
        v-if="tabs.length > 1"
        v-model="category"
        :items="tabs"
        :content="false"
        variant="link"
        size="sm"
        :ui="TABS_UI"
      />
      <ul
        v-if="shown.length"
        ref="grid"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3"
        :aria-label="t('results', { count: shown.length })"
        @keydown="moveFocus"
      >
        <li
          v-for="offer in shown"
          :key="offer.definition.type"
        >
          <button
            type="button"
            data-library-card
            class="flex w-full flex-col gap-2 rounded-md p-2 text-start ring ring-default transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            :class="offer.refusal ? 'cursor-not-allowed opacity-60' : 'hover:bg-elevated/60'"
            :aria-disabled="Boolean(offer.refusal)"
            :aria-describedby="offer.refusal ? `refusal-${offer.definition.type}` : undefined"
            @click="() => add(offer)"
          >
            <span class="block overflow-hidden rounded-sm bg-muted">
              <BuilderSchematic :type="offer.definition.type" />
            </span>
            <span class="text-sm font-medium">{{ blockLabel(offer.definition.type) }}</span>
            <span
              v-if="offer.refusal"
              :id="`refusal-${offer.definition.type}`"
              class="text-xs text-muted"
            >{{ refusalText(offer) }}</span>
          </button>
        </li>
      </ul>
      <UEmpty
        v-else
        icon="i-lucide-search-x"
        variant="naked"
        :title="t('none.title')"
        :description="t('none.description')"
      />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  titleSection: Προσθήκη ενότητας
  titleBlock: "Προσθήκη στο «{name}»"
  description: Διαλέξτε τι θα προστεθεί. Θα εμφανιστεί αμέσως στην προεπισκόπηση, έτοιμο να το αλλάξετε.
  search: Αναζήτηση
  all: Όλα
  results: "{count} επιλογές"
  refusal:
    feature: "Χρειάζεται {feature}, που είναι κλειστό σε αυτό το κατάστημα."
    perTemplate: "Η σελίδα έχει ήδη όσα επιτρέπονται ({count})."
    full: "Δεν χωράει άλλο ({count} το πολύ)."
  none:
    title: Τίποτα δεν ταιριάζει
    description: Δοκιμάστε άλλη λέξη ή άλλη κατηγορία.
en:
  titleSection: Add a section
  titleBlock: "Add to “{name}”"
  description: Pick what to add. It appears in the preview right away, ready to change.
  search: Search
  all: All
  results: "{count} choices"
  refusal:
    feature: "Needs {feature}, which is off for this store."
    perTemplate: "The page already has as many as it may ({count})."
    full: "There's no room for more ({count} at most)."
  none:
    title: Nothing matches
    description: Try another word or another category.
</i18n>
