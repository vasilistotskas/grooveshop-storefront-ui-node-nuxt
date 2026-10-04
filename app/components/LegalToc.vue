<script lang="ts" setup>
/**
 * The "On this page" list of a legal document, as the board draws it:
 * a sticky card beside the text from `lg` up, and below that one button
 * that opens the same list in a bottom sheet.
 *
 * The links come from the document's own headings (`buildLegalToc`), so
 * every one has an anchor to jump to. A document with no headings gets
 * no list: rendering the title over nothing would be chrome advertising
 * nothing.
 */
interface TocLink {
  id: string
  text: string
}

const props = defineProps<{
  title: string
  links: TocLink[]
}>()

const isOpen = ref(false)
const activeId = ref<string | null>(null)

onMounted(() => {
  const sections = props.links
    .map(link => document.getElementById(link.id))
    .filter((el): el is HTMLElement => el !== null)
  if (!sections.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0]
      if (visible) activeId.value = visible.target.id
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.5, 1] },
  )

  for (const el of sections) observer.observe(el)
  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <div v-if="links.length">
    <!-- Phone and tablet: one button, the list in a sheet. -->
    <UDrawer
      v-model:open="isOpen"
      :title="title"
    >
      <UButton
        :label="title"
        icon="i-lucide-list"
        trailing-icon="i-lucide-chevron-down"
        color="neutral"
        variant="outline"
        block
        class="justify-between lg:hidden"
      />
      <template #body>
        <ul class="flex flex-col gap-1 pb-4 text-sm">
          <li
            v-for="link in links"
            :key="link.id"
          >
            <a
              :href="`#${link.id}`"
              class="block rounded-xl px-3 py-2.5 text-toned hover:bg-elevated"
              @click="() => { isOpen = false }"
            >
              {{ link.text }}
            </a>
          </li>
        </ul>
      </template>
    </UDrawer>

    <!-- Desktop: the sticky card. -->
    <nav
      :aria-label="title"
      class="
        hidden rounded-[1.25rem] bg-default p-3 ring ring-default
        lg:sticky lg:top-24 lg:block
      "
    >
      <ul class="flex flex-col gap-1 text-sm">
        <li
          v-for="link in links"
          :key="link.id"
        >
          <a
            :href="`#${link.id}`"
            :aria-current="activeId === link.id ? 'location' : undefined"
            class="block rounded-xl px-3 py-2.5 transition-colors"
            :class="activeId === link.id
              ? 'bg-elevated font-medium text-highlighted ring ring-default'
              : 'text-toned hover:bg-elevated hover:text-highlighted'"
          >
            {{ link.text }}
          </a>
        </li>
      </ul>
    </nav>
  </div>
</template>
