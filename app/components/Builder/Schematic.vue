<script lang="ts" setup>
const props = defineProps<{
  /** The block type whose layout the picture shows (`BUILDER_SCHEMATICS`). */
  type: string
}>()

const shapes = computed(() => BUILDER_SCHEMATICS[props.type] ?? [])

/** The tones of a schematic, as the editor's palette paints them. */
const TONE_CLASS = {
  frame: 'fill-(--ui-bg-accented)',
  text: 'fill-(--ui-text-dimmed)',
  accent: 'fill-(--ui-primary)',
} as const satisfies Record<BuilderSchematicTone, string>
</script>

<template>
  <svg
    :viewBox="`0 0 ${BUILDER_SCHEMATIC_VIEW.width} ${BUILDER_SCHEMATIC_VIEW.height}`"
    class="block h-auto w-full"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      v-for="(shape, index) in shapes"
      :key="index"
      :x="shape.x"
      :y="shape.y"
      :width="shape.width"
      :height="shape.height"
      :rx="shape.round ? Math.min(shape.width, shape.height) / 2 : 2"
      :class="TONE_CLASS[shape.tone]"
    />
  </svg>
</template>
