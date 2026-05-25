<script lang="ts" setup>
interface TocLink {
  id: string
  text: string
}

const props = defineProps<{
  title: string
  links: TocLink[]
}>()

const accordionItems = computed(() => [
  {
    value: 'toc',
    label: props.title,
    icon: 'i-heroicons-list-bullet',
  },
])

const activeId = ref<string | null>(null)

onMounted(() => {
  const sections = props.links
    .map(l => document.getElementById(l.id))
    .filter((el): el is HTMLElement => el !== null)
  if (!sections.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
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
  <div
    class="
      order-first
      lg:sticky lg:top-24 lg:order-last
    "
  >
    <!-- Mobile accordion: collapsed jump list -->
    <UAccordion
      :items="accordionItems"
      class="lg:hidden"
    >
      <template #body>
        <ul class="space-y-2 px-2 py-3 text-sm">
          <li
            v-for="link in links"
            :key="link.id"
          >
            <a
              :href="`#${link.id}`"
              class="
                text-primary-700 underline-offset-2
                hover:underline
                dark:text-primary-300
              "
            >
              {{ link.text }}
            </a>
          </li>
        </ul>
      </template>
    </UAccordion>

    <!-- Desktop sticky TOC -->
    <nav
      :aria-label="title"
      class="
        hidden
        lg:block
      "
    >
      <p
        class="
          mb-3 text-xs font-semibold tracking-wide text-muted uppercase
        "
      >
        {{ title }}
      </p>
      <ul class="space-y-1 text-sm">
        <li
          v-for="link in links"
          :key="link.id"
        >
          <a
            :href="`#${link.id}`"
            :class="[
              'block rounded-md border-l-2 px-3 py-1.5 transition-colors',
              activeId === link.id
                ? `
                  border-primary font-medium text-primary
                `
                : `
                  border-transparent text-muted
                  hover:text-default
                `,
            ]"
          >
            {{ link.text }}
          </a>
        </li>
      </ul>
    </nav>
  </div>
</template>
