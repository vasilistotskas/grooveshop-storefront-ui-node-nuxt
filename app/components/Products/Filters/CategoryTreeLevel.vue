<script lang="ts" setup>
/**
 * One level of the category tree (`CategoryTree.vue`), drawing the next
 * level below each category on the path to the current one.
 */
import type { CategoryNode } from '~/utils/categoryTree'

const props = defineProps<{
  nodes: CategoryNode[]
  /** Root → the current category, by id. */
  trailIds: number[]
  depth?: number
}>()

const localePath = useLocalePath()

const level = computed(() => props.depth ?? 0)
const currentId = computed(() => props.trailIds.at(-1))
// The current category's own children are the next step down, set a
// weight lighter than the path that leads to them.
const isNextStep = computed(() => level.value > 0 && props.trailIds[level.value - 1] === currentId.value)
</script>

<template>
  <ul
    class="flex flex-col gap-2 text-sm"
    :class="level > 0 && 'border-s border-default ps-3.5'"
  >
    <li
      v-for="node in nodes"
      :key="node.id"
      class="flex flex-col gap-2"
    >
      <ULink
        :to="localePath(node.to)"
        :aria-current="node.id === currentId ? 'page' : undefined"
        class="flex items-baseline justify-between gap-3"
        :class="[
          isNextStep ? 'font-medium' : 'font-semibold',
          node.id === currentId ? 'text-accent' : 'text-highlighted hover:text-accent',
        ]"
      >
        <span>{{ node.label }}</span>
        <span
          v-if="node.count !== null"
          class="font-mono text-xs"
          :class="node.id !== currentId && 'text-muted'"
        >
          {{ node.count }}
        </span>
      </ULink>
      <ProductsFiltersCategoryTreeLevel
        v-if="trailIds.includes(node.id) && node.children.length"
        :nodes="node.children"
        :trail-ids="trailIds"
        :depth="level + 1"
      />
    </li>
  </ul>
</template>
