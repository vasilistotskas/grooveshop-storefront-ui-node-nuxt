<script lang="ts" setup>
const props = defineProps<{
  /** The page document the preview draws. */
  documentKey: string
}>()

const { t } = useStoreI18n('components/Builder/Canvas')
const { documentLabel, nodeLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const { device, selected, openDocument, select, setDevice } = useBuilderEditorView()
const toast = useToast()

const frame = useTemplateRef<HTMLIFrameElement>('frame')
const pane = useTemplateRef<HTMLElement>('pane')
const { width: paneWidth, height: paneHeight } = useElementSize(pane)

/** Where the canvas stands: drawing the copies it was sent, showing them, or showing the last it could. */
const state = ref<'loading' | 'drawn' | 'failed'>('loading')

/** The store page that draws the document, asked for as the preview (`BUILDER_CANVAS_QUERY`). */
const src = computed(() => {
  const path = builderDocumentPath(props.documentKey)
  return path === undefined ? undefined : `${path}?${BUILDER_CANVAS_QUERY}`
})
watch(src, () => {
  state.value = 'loading'
})

/** The copies the preview draws: this page, and the section groups around it. */
const documents = computed<BuilderCanvasDocuments>(() => Object.fromEntries(
  [props.documentKey, ...store.groups.map(({ key }) => key)].flatMap((key) => {
    const document = store.opened[key]
    return document ? [[key, document.copy]] : []
  }),
))

/** The selected node, when it is a section of this page: the canvas draws the page's sections only. */
const selectedNode = computed(() => {
  const ref = selected.value ? parseBuilderNodeRef(selected.value) : undefined
  return ref?.documentKey === props.documentKey ? ref.nodeId : null
})

/** Where the section under the pointer and the selected one are drawn in the canvas (its CSS pixels). */
const boxes = ref<{ hover: BuilderCanvasBox | null, selected: BuilderCanvasBox | null }>({ hover: null, selected: null })

function tellSelection(): void {
  const command: BuilderCanvasCommand = { channel: BUILDER_CANVAS_CHANNEL, type: 'select', node: selectedNode.value }
  frame.value?.contentWindow?.postMessage(command, window.location.origin)
}
watch(selectedNode, tellSelection)

function send(): void {
  const target = frame.value?.contentWindow
  if (!target) return
  // A plain copy: the store's reactive copies cannot cross windows.
  const command: BuilderCanvasCommand = { channel: BUILDER_CANVAS_CHANNEL, type: 'documents', documents: JSON.parse(JSON.stringify(documents.value)) }
  target.postMessage(command, window.location.origin)
}
watch(documents, send, { deep: true })

useEventListener(window, 'message', (event: MessageEvent) => {
  if (!frame.value || event.source !== frame.value.contentWindow || event.origin !== window.location.origin) return
  const message = ZodBuilderCanvasEvent.safeParse(event.data)
  if (!message.success) return
  switch (message.data.type) {
    case 'ready':
      send()
      tellSelection()
      break
    case 'pick':
      void select(builderNodeRef(props.documentKey, message.data.node))
      break
    case 'boxes':
      // The pointer left the frame for an insert point over it: the section it
      // was on stays the hovered one until the pointer leaves the insert point.
      boxes.value = {
        hover: message.data.hover ?? (onInsertPoint.value ? boxes.value.hover : null),
        selected: message.data.selected,
      }
      break
    case 'drawn':
      state.value = 'drawn'
      break
    case 'failed':
      state.value = 'failed'
      break
    case 'navigate':
      void follow(message.data.path)
      break
  }
})

/** A link followed in the preview opens the page it leads to, when the store builds that page here. */
async function follow(path: string): Promise<void> {
  const key = builderDocumentAt(path, store.pages.map(({ key }) => key))
  if (key) {
    if (key !== props.documentKey) await openDocument(key)
    return
  }
  toast.add({ title: t('elsewhere.title'), description: t('elsewhere.description', { path }), icon: 'i-lucide-info', color: 'info' })
}

const DEVICE_ICONS = {
  phone: 'i-lucide-smartphone',
  tablet: 'i-lucide-tablet',
  desktop: 'i-lucide-monitor',
  full: 'i-lucide-maximize-2',
} as const satisfies Record<BuilderPreviewDevice, string>
const devices = Object.keys(BUILDER_PREVIEW_DEVICES) as BuilderPreviewDevice[]

/**
 * The frame is drawn at the device's width and scaled down to fit the pane
 * when the pane is narrower, so a desktop page keeps its desktop layout.
 */
const frameWidth = computed(() => BUILDER_PREVIEW_DEVICES[device.value] ?? paneWidth.value)
const scale = computed(() => frameWidth.value > 0 && paneWidth.value > 0 ? Math.min(1, paneWidth.value / frameWidth.value) : 1)
const frameStyle = computed(() => ({
  width: `${frameWidth.value}px`,
  height: `${paneHeight.value / scale.value}px`,
  transform: scale.value < 1 ? `scale(${scale.value})` : undefined,
}))

/**
 * A box of the canvas in the pane's pixels: through the frame's offset in the
 * pane and its scale. Read when the boxes change, which the canvas reports on
 * every scroll and resize.
 */
function inPane(box: BuilderCanvasBox | null) {
  const frameElement = frame.value
  const paneElement = pane.value
  if (!box || !frameElement || !paneElement) return undefined
  const origin = frameElement.getBoundingClientRect()
  const within = paneElement.getBoundingClientRect()
  return {
    left: origin.left - within.left + box.x * scale.value,
    top: origin.top - within.top + box.y * scale.value,
    width: box.width * scale.value,
    height: box.height * scale.value,
  }
}
const hoverOutline = computed(() => inPane(boxes.value.hover))
const selectedOutline = computed(() => inPane(boxes.value.selected))
const pixels = (value: number) => `${value}px`

/** The toolbar sits above the selected section, inside it when there is no room above, and never past the pane's edges. */
const toolbarStyle = computed(() => {
  const outline = selectedOutline.value
  if (!outline) return undefined
  const above = outline.top - BUILDER_CANVAS_TOOLBAR.height - BUILDER_CANVAS_TOOLBAR.gap
  return {
    top: pixels(above >= 0 ? above : Math.max(outline.top, 0) + BUILDER_CANVAS_TOOLBAR.gap),
    left: pixels(Math.min(Math.max(outline.left, BUILDER_CANVAS_TOOLBAR.gap), paneWidth.value - BUILDER_CANVAS_TOOLBAR.width - BUILDER_CANVAS_TOOLBAR.gap)),
    width: pixels(BUILDER_CANVAS_TOOLBAR.width),
  }
})

const library = useBuilderLibraryStore()

/** Whether the pointer is on an insert point: the hovered section keeps its outline and points while it is. */
const onInsertPoint = ref(false)
function leaveInsertPoint(): void {
  onInsertPoint.value = false
}

/**
 * Where the preview offers to add a section: below the section under the
 * pointer and below the selected one, and above the first section, so every
 * place between sections is one click away. Each is a point on the edge of
 * that section's outline, in the pane's pixels, and the index the new section
 * takes in the page.
 */
const insertPoints = computed(() => {
  const document = store.opened[props.documentKey]
  if (!store.canEdit || !document) return []
  const order = document.copy.draft.order
  const nameOf = (node: string) => {
    const section = document.copy.draft.sections[node]
    return section ? nodeLabel(section) : node
  }
  const points = new Map<string, { key: string, left: number, top: number, index: number, label: string }>()
  for (const box of [boxes.value.hover, boxes.value.selected]) {
    const outline = inPane(box)
    const index = box ? order.indexOf(box.node) : -1
    if (!box || !outline || index < 0) continue
    const left = outline.left + outline.width / 2
    points.set(`below:${box.node}`, { key: `below:${box.node}`, left, top: outline.top + outline.height, index: index + 1, label: t('insert.below', { name: nameOf(box.node) }) })
    if (index === 0) points.set(`above:${box.node}`, { key: `above:${box.node}`, left, top: outline.top, index: 0, label: t('insert.above', { name: nameOf(box.node) }) })
  }
  return [...points.values()]
})

function insertAt(index: number): void {
  onInsertPoint.value = false
  library.open(props.documentKey, { index })
}

const pageName = computed(() => documentLabel(props.documentKey))
</script>

<template>
  <section
    class="flex h-full min-h-0 flex-col"
    :aria-label="t('label')"
  >
    <div class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-default px-3">
      <p class="min-w-0 truncate text-sm text-muted">
        {{ pageName }}
      </p>
      <UFieldGroup
        role="group"
        :aria-label="t('devices.label')"
      >
        <UTooltip
          v-for="name in devices"
          :key="name"
          :text="t(`devices.${name}`)"
        >
          <UButton
            :icon="DEVICE_ICONS[name]"
            color="neutral"
            :variant="device === name ? 'soft' : 'ghost'"
            size="sm"
            :aria-label="t(`devices.${name}`)"
            :aria-pressed="device === name"
            @click="() => setDevice(name)"
          />
        </UTooltip>
      </UFieldGroup>
    </div>

    <UAlert
      v-if="state === 'failed'"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('failed.title')"
      :description="t('failed.description')"
      :actions="[{ label: t('failed.retry'), color: 'warning', variant: 'outline', onClick: send }]"
      class="m-3 shrink-0"
    />

    <div
      ref="pane"
      class="relative min-h-0 flex-1 overflow-hidden bg-muted"
    >
      <template v-if="src">
        <div class="flex h-full justify-center">
          <iframe
            ref="frame"
            :key="src"
            :src="src"
            :title="t('frame', { name: pageName })"
            sandbox="allow-same-origin allow-scripts"
            class="shrink-0 origin-top border-0 bg-default"
            :style="frameStyle"
          />
        </div>
        <div
          v-if="hoverOutline"
          class="pointer-events-none absolute rounded-sm border-2 border-dashed border-primary/60"
          :style="{ left: pixels(hoverOutline.left), top: pixels(hoverOutline.top), width: pixels(hoverOutline.width), height: pixels(hoverOutline.height) }"
          data-builder-outline="hover"
        />
        <div
          v-if="selectedOutline"
          class="pointer-events-none absolute rounded-sm border-2 border-primary"
          :style="{ left: pixels(selectedOutline.left), top: pixels(selectedOutline.top), width: pixels(selectedOutline.width), height: pixels(selectedOutline.height) }"
          data-builder-outline="selected"
        />
        <UTooltip
          v-for="point in insertPoints"
          :key="point.key"
          :text="point.label"
        >
          <UButton
            icon="i-lucide-plus"
            color="primary"
            size="xs"
            class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
            :style="{ left: pixels(point.left), top: pixels(point.top) }"
            :aria-label="point.label"
            data-builder-insert
            @mouseenter="() => { onInsertPoint = true }"
            @mouseleave="leaveInsertPoint"
            @click="() => insertAt(point.index)"
          />
        </UTooltip>
        <div
          v-if="toolbarStyle && store.canEdit"
          class="absolute rounded-md bg-default p-2 shadow-lg ring ring-default"
          :style="toolbarStyle"
        >
          <BuilderNodeActions />
        </div>
        <div
          v-if="state === 'loading'"
          class="absolute inset-0 grid place-items-center bg-default/80"
          role="status"
        >
          <span class="flex items-center gap-2 text-sm text-muted">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin"
            />
            {{ t('loading') }}
          </span>
        </div>
      </template>
      <UEmpty
        v-else
        icon="i-lucide-monitor-off"
        variant="naked"
        class="h-full"
        :title="t('none.title')"
        :description="t('none.description')"
      />
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  label: Προεπισκόπηση
  insert:
    below: "Προσθήκη ενότητας κάτω από: {name}"
    above: "Προσθήκη ενότητας πάνω από: {name}"
  frame: "Προεπισκόπηση: {name}"
  loading: Η προεπισκόπηση σχεδιάζεται…
  devices:
    label: Πλάτος προεπισκόπησης
    phone: Κινητό
    tablet: Tablet
    desktop: Υπολογιστής
    full: Όλο το πλάτος
  failed:
    title: Η προεπισκόπηση δεν ενημερώθηκε
    description: Δείχνει την τελευταία εκδοχή που μπόρεσε να σχεδιάσει. Οι αλλαγές σας αποθηκεύονται κανονικά.
    retry: Δοκιμή ξανά
  elsewhere:
    title: Αυτή η σελίδα δεν φτιάχνεται εδώ
    description: "Ο σύνδεσμος οδηγεί στο {path}, που δεν είναι σελίδα του επεξεργαστή."
  none:
    title: Δεν υπάρχει προεπισκόπηση
    description: Αυτή η σελίδα δεν εμφανίζεται μόνη της στο κατάστημα.
en:
  label: Preview
  insert:
    below: "Add a section below {name}"
    above: "Add a section above {name}"
  frame: "Preview: {name}"
  loading: Drawing the preview…
  devices:
    label: Preview width
    phone: Phone
    tablet: Tablet
    desktop: Desktop
    full: Full width
  failed:
    title: The preview didn't update
    description: It shows the last version it could draw. Your changes are still being saved.
    retry: Try again
  elsewhere:
    title: This page isn't built here
    description: "The link leads to {path}, which isn't a page of the editor."
  none:
    title: No preview
    description: This page isn't shown on its own in the store.
</i18n>
