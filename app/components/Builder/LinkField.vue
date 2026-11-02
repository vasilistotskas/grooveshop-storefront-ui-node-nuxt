<script lang="ts" setup>
const props = defineProps<{
  /** The link setting's name, for the controls' accessible names. */
  label: string
  value: unknown
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The new link (`{ href }`, `{ route }`), or `undefined` for none. */
  update: [value: BuilderLink | undefined]
}>()

const { t } = useStoreI18n('components/Builder/LinkField')
const { routeLabel } = useBuilderLabels()

type Mode = 'none' | 'route' | 'href' | 'ref'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** What the stored link points at, read off its shape. */
const storedMode = computed<Mode>(() => {
  const link = props.value
  if (!isRecord(link)) return 'none'
  if ('route' in link) return 'route'
  if ('href' in link) return 'href'
  return 'ref' in link ? 'ref' : 'none'
})

/** A record a link names keeps its place: it is chosen with the record picker, which comes next. */
const recordLink = computed(() => {
  const link = props.value
  return isRecord(link) && isRecord(link.ref) ? link.ref as { kind: string, id: string | number } : undefined
})

const modeItems = computed(() => [
  { label: t('mode.none'), value: 'none' },
  { label: t('mode.route'), value: 'route' },
  { label: t('mode.href'), value: 'href' },
  ...(recordLink.value ? [{ label: t('mode.ref'), value: 'ref' }] : []),
])

const routeItems = computed(() => LINK_ROUTES.map(route => ({ label: routeLabel(route), value: route })))

/**
 * The kind of link being written. An external address is chosen before one
 * is typed, and an empty one is no link: only a whole address is saved.
 */
const mode = ref<Mode>(storedMode.value)
watch(storedMode, (next) => {
  if (next !== 'none' || mode.value !== 'href') mode.value = next
})

const route = computed(() => LINK_ROUTES.find(known => isRecord(props.value) && props.value.route === known))
const href = computed(() => isRecord(props.value) && typeof props.value.href === 'string' ? props.value.href : '')

function setMode(next: unknown): void {
  if (next === mode.value) return
  if (next === 'route') {
    mode.value = 'route'
    emit('update', { route: LINK_ROUTES[0] })
  }
  else if (next === 'href') {
    mode.value = 'href'
    emit('update', undefined)
  }
  else if (next === 'none') {
    mode.value = 'none'
    emit('update', undefined)
  }
}

function setHref(next: string): void {
  const value = next.trim()
  emit('update', value ? { href: value } : undefined)
}

function setRoute(next: unknown): void {
  const value = LINK_ROUTES.find(route => route === next)
  if (value) emit('update', { route: value })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <USelect
      :model-value="mode"
      :items="modeItems"
      :aria-label="t('modeLabel', { name: label })"
      :disabled="disabled"
      class="w-full"
      @update:model-value="setMode"
    />
    <USelect
      v-if="mode === 'route'"
      :model-value="route"
      :items="routeItems"
      :aria-label="t('routeLabel', { name: label })"
      :disabled="disabled"
      class="w-full"
      @update:model-value="setRoute"
    />
    <UInput
      v-else-if="mode === 'href'"
      :model-value="href"
      type="url"
      placeholder="https://"
      :aria-label="t('hrefLabel', { name: label })"
      :disabled="disabled"
      class="w-full"
      @update:model-value="setHref"
    />
    <p
      v-else-if="mode === 'ref' && recordLink"
      class="text-sm text-toned"
    >
      {{ t(`record.${recordLink.kind}`, { id: recordLink.id }) }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  modeLabel: "Πού οδηγεί: {name}"
  routeLabel: "Σελίδα του καταστήματος: {name}"
  hrefLabel: "Εξωτερική διεύθυνση: {name}"
  mode:
    none: Χωρίς σύνδεσμο
    route: Σελίδα του καταστήματος
    href: Εξωτερική διεύθυνση
    ref: Συγκεκριμένη εγγραφή
  record:
    product: "Προϊόν #{id}"
    category: "Κατηγορία #{id}"
    blogPost: "Άρθρο #{id}"
    blogCategory: "Κατηγορία ιστολογίου #{id}"
    page: "Σελίδα «{id}»"
    contentPage: "Σελίδα περιεχομένου «{id}»"
en:
  modeLabel: "Where it leads: {name}"
  routeLabel: "Store page: {name}"
  hrefLabel: "External address: {name}"
  mode:
    none: No link
    route: A store page
    href: An external address
    ref: A particular record
  record:
    product: "Product #{id}"
    category: "Category #{id}"
    blogPost: "Blog post #{id}"
    blogCategory: "Blog category #{id}"
    page: "Page “{id}”"
    contentPage: "Content page “{id}”"
</i18n>
