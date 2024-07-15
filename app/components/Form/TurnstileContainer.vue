<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    firstShowOn?: boolean
  }>(),
  {
    firstShowOn: undefined,
  },
)

const isLoaded = ref(false)
const timeout: Ref<NodeJS.Timeout | null> = ref(null)

if (props.firstShowOn !== undefined) {
  watch(
    () => props.firstShowOn,
    (value) => {
      if (value && !isLoaded.value) {
        isLoaded.value = true
      }
    },
  )
}
else {
  onMounted(() => {
    timeout.value = setTimeout(() => {
      isLoaded.value = true
    }, 500)
  })
  onBeforeUnmount(() => {
    if (timeout.value) {
      clearTimeout(timeout.value)
    }
  })
}
</script>

<template>
  <div class="mt-4 flex justify-center">
    <slot v-if="isLoaded" />
  </div>
</template>
