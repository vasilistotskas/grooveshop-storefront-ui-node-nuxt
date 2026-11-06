<script lang="ts" setup>
const props = defineProps<{
  /** The asset id stored, or none yet. */
  value: unknown
  /** The setting's name, for the controls' accessible names. */
  label: string
  /** Whether the image may be cleared: a setting that may be left empty. */
  clearable: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The id of the image chosen, or `undefined` once it is cleared. */
  update: [id: number | undefined]
}>()

const { t } = useStoreI18n('components/Builder/MediaField')

const open = ref(false)
const id = computed(() => typeof props.value === 'number' ? props.value : undefined)

// The chosen image: a setting holds only its id.
const { data: asset, error, refresh } = useLazyApi(() => `/api/builder/media/${id.value}`, {
  enabled: computed(() => id.value !== undefined),
})

/** Whether the library no longer has the image: the page shows that block without one. */
const unavailable = computed(() => id.value !== undefined && error.value?.statusCode === 404)
const name = computed(() => asset.value ? builderMediaName(asset.value.path) : t('image', { id: id.value }))

/** The library deleted an image: if the setting holds it, it holds nothing (publishing would be refused). */
function forget(removed: number): void {
  if (removed === id.value) emit('update', undefined)
}

function choose(chosen: Asset): void {
  emit('update', chosen.id)
  void refresh()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="id !== undefined"
      class="flex items-center gap-3"
    >
      <div class="size-14 shrink-0 overflow-hidden rounded-md bg-elevated ring ring-default">
        <ImgWithFallback
          v-if="asset"
          :src="asset.path"
          alt=""
          :width="56"
          :height="56"
          fit="cover"
          class="size-full object-cover"
        />
      </div>
      <p class="min-w-0 flex-1 truncate text-sm">
        {{ name }}
      </p>
    </div>
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
    <div class="flex flex-wrap gap-2">
      <UButton
        icon="i-lucide-image"
        color="neutral"
        variant="outline"
        size="sm"
        :label="id === undefined ? t('choose') : t('change')"
        :aria-label="t(id === undefined ? 'chooseOf' : 'changeOf', { name: label })"
        :disabled="disabled"
        @click="() => { open = true }"
      />
      <UButton
        v-if="id !== undefined && clearable"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="t('clear')"
        :aria-label="t('clearOf', { name: label })"
        :disabled="disabled"
        @click="() => emit('update', undefined)"
      />
    </div>
    <BuilderMediaPicker
      v-model:open="open"
      :selected="id"
      @select="choose"
      @remove="forget"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  image: "Εικόνα #{id}"
  choose: Επιλογή εικόνας
  chooseOf: "Επιλογή εικόνας: {name}"
  change: Αλλαγή εικόνας
  changeOf: "Αλλαγή εικόνας: {name}"
  clear: Αφαίρεση
  clearOf: "Αφαίρεση εικόνας: {name}"
  unavailable: Δεν είναι πια διαθέσιμη· η ενότητα εμφανίζεται χωρίς εικόνα.
en:
  image: "Image #{id}"
  choose: Choose an image
  chooseOf: "Choose an image: {name}"
  change: Change image
  changeOf: "Change image: {name}"
  clear: Remove
  clearOf: "Remove the image: {name}"
  unavailable: No longer available; the section shows without an image.
</i18n>
