<script lang="ts" setup>
/**
 * One colour of the theme: a swatch that opens a colour picker, and the
 * colour as `#RRGGBB` to type or paste. Only a whole `#RRGGBB` reaches the
 * theme; anything else stays in the field, marked, until it is one.
 */
const props = defineProps<{
  label: string
  description?: string
  disabled?: boolean
}>()
const model = defineModel<string>({ required: true })

const { t } = useStoreI18n('components/Builder/ThemeColorField')

/** What is typed, which follows the colour unless it is being typed into. */
const typed = ref(model.value)
watch(model, (value) => {
  typed.value = value
})
const invalid = computed(() => !HEX_COLOR_RE.test(typed.value))

function type(value: string): void {
  typed.value = value.trim()
  if (HEX_COLOR_RE.test(typed.value)) model.value = typed.value.toLowerCase()
}

function pick(value: string | undefined): void {
  if (value && HEX_COLOR_RE.test(value)) model.value = value.toLowerCase()
}
</script>

<template>
  <UFormField
    :label="props.label"
    :description="props.description"
    :error="invalid ? t('invalid') : undefined"
  >
    <div class="flex items-center gap-2">
      <UPopover :disabled="props.disabled">
        <UButton
          color="neutral"
          variant="outline"
          square
          :disabled="props.disabled"
          :aria-label="t('pick', { label: props.label })"
        >
          <span
            class="size-5 rounded-sm border border-default"
            :style="{ backgroundColor: model }"
          />
        </UButton>
        <template #content>
          <UColorPicker
            :model-value="model"
            class="p-2"
            @update:model-value="pick"
          />
        </template>
      </UPopover>
      <UInput
        :model-value="typed"
        :disabled="props.disabled"
        maxlength="7"
        class="w-28 font-mono"
        @update:model-value="(value) => type(String(value))"
      />
    </div>
  </UFormField>
</template>

<i18n lang="yaml">
el:
  pick: "Επιλογή χρώματος: {label}"
  invalid: Γράψτε το χρώμα ως #RRGGBB.
en:
  pick: "Pick a colour: {label}"
  invalid: Write the colour as #RRGGBB.
</i18n>
