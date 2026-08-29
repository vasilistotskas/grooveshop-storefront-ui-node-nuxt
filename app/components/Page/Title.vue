<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      font-display mt-2 text-2xl font-bold
      md:text-4xl
    "
  >
    <!-- h1, not h2: this component IS the page's main heading (every
         page uses it exactly once). The page h1 used to come from the
         navbar logo instead, which made "Webside" the h1 of 15 unrelated
         URLs and gave a second h1 to the 15 pages that did have their
         own heading. -->
    <h1
      class="
        text-primary-950
        dark:text-primary-50
      "
    >
      <slot>{{ text }}</slot>
    </h1>
  </div>
</template>
