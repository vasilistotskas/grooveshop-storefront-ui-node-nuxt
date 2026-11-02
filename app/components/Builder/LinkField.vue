<script lang="ts" setup>
const props = defineProps<{
  /** The link setting's name, for the controls' accessible names. */
  label: string
  value: unknown
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The new link (`{ href }`, `{ route }`, `{ ref }`), or `undefined` for none. */
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

/** The record a link names, chosen with the record picker. */
const recordLink = computed(() => {
  const ref = isRecord(props.value) && isRecord(props.value.ref) ? props.value.ref : undefined
  const kind = LINK_REF_KINDS.find(known => known === ref?.kind)
  return kind && (typeof ref?.id === 'number' || typeof ref?.id === 'string') ? builderLinkRefOf(kind, ref.id) : undefined
})

const modeItems = computed(() => [
  { label: t('mode.none'), value: 'none' },
  { label: t('mode.route'), value: 'route' },
  { label: t('mode.href'), value: 'href' },
  { label: t('mode.ref'), value: 'ref' },
])

const routeItems = computed(() => LINK_ROUTES.map(route => ({ label: routeLabel(route), value: route })))

/**
 * The kind of link being written. An external address is chosen before one
 * is typed, and a record before one is picked: until then it is no link, so
 * only a whole address or a record is saved.
 */
const mode = ref<Mode>(storedMode.value)
watch(storedMode, (next) => {
  if (next !== 'none' || (mode.value !== 'href' && mode.value !== 'ref')) mode.value = next
})

const route = computed(() => LINK_ROUTES.find(known => isRecord(props.value) && props.value.route === known))
const href = computed(() => isRecord(props.value) && typeof props.value.href === 'string' ? props.value.href : '')

function setMode(next: unknown): void {
  if (next === mode.value) return
  if (next === 'route') {
    mode.value = 'route'
    emit('update', { route: LINK_ROUTES[0] })
  }
  else if (next === 'href' || next === 'ref') {
    mode.value = next
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

function setRecord(next: BuilderLinkRef | undefined): void {
  emit('update', next ? { ref: next } : undefined)
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
    <BuilderRecordPicker
      v-else-if="mode === 'ref'"
      :kinds="LINK_REF_KINDS"
      :value="recordLink"
      :label="t('refLabel', { name: label })"
      :clearable="false"
      :disabled="disabled"
      @update="setRecord"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  modeLabel: "Πού οδηγεί: {name}"
  routeLabel: "Σελίδα του καταστήματος: {name}"
  hrefLabel: "Εξωτερική διεύθυνση: {name}"
  refLabel: "Εγγραφή: {name}"
  mode:
    none: Χωρίς σύνδεσμο
    route: Σελίδα του καταστήματος
    href: Εξωτερική διεύθυνση
    ref: Προϊόν, κατηγορία, άρθρο ή σελίδα
en:
  modeLabel: "Where it leads: {name}"
  routeLabel: "Store page: {name}"
  hrefLabel: "External address: {name}"
  refLabel: "Record: {name}"
  mode:
    none: No link
    route: A store page
    href: An external address
    ref: A product, category, post or page
</i18n>
