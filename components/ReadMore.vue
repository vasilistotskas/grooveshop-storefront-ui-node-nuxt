<script lang="ts" setup>
import { v4 as uuidv4 } from 'uuid'

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

const uuid = uuidv4()
const showFullText = useState<boolean>(`${uuid}-read-more`, () => false)

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
        text-primary-950 overflow-hidden

        dark:text-primary-50
      "
    >
      <span
        class="
          text-sm

          md:text-base
        "
        v-html="trimmedText"
      />
    </div>
    <div
      v-else
      class="
        text-primary-950 overflow-hidden

        dark:text-primary-50
      "
    >
      <span
        class="
          text-sm

          md:text-base
        "
        v-html="text"
      />
    </div>
    <div class="bottom-0 right-0 grid justify-end">
      <UButton
        :label="showFullText ? $t('common.read_less') : $t('common.read_more')"
        size="xs"
        color="primary"
        @click="toggleFullText"
      />
    </div>
  </div>
  <span
    v-else
    class="
      text-primary-950 text-sm

      dark:text-primary-50

      md:text-base
    "
  >
    {{ text }}
  </span>
</template>
