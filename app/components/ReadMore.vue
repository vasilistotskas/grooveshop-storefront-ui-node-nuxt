<script lang="ts" setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  maxChars: {
    type: Number,
    default: 100,
  },
})

const uuid = useId()
const showFullText = useState<boolean>(`${uuid}-read-more`, () => false)
const { $i18n } = useNuxtApp()

const toggleFullText = () => {
  showFullText.value = !showFullText.value
}

const trimmedText = computed(() => {
  return props.text && props.text.length > props.maxChars
    ? props.text.substring(0, props.maxChars) + '...'
    : props.text
})
</script>

<template>
  <div
    v-if="text && text.length > maxChars"
    class="relative flex flex-col"
  >
    <div
      v-if="!showFullText"
      class="
        overflow-hidden text-primary-950
        dark:text-primary-50
      "
    >
      <span
        class="
          block text-sm
          md:text-base
        "
        v-html="trimmedText"
      />
    </div>
    <div
      v-else
      class="
        overflow-hidden text-primary-950
        dark:text-primary-50
      "
    >
      <span
        class="
          block text-sm
          md:text-base
        "
        v-html="text"
      />
    </div>
    <div class="right-0 bottom-0 grid justify-end">
      <UButton
        :label="showFullText ? $i18n.t('read_less') : $i18n.t('read_more')"
        size="xs"
        color="neutral"
        @click="toggleFullText"
      />
    </div>
  </div>
  <span
    v-else
    class="
      block text-sm text-primary-950
      md:text-base
      dark:text-primary-50
    "
  >
    {{ text }}
  </span>
</template>

<i18n lang="yaml">
el:
  read:
    more: Διάβασε περισσότερα
    less: Διάβασε λιγότερα
</i18n>
