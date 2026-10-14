<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The dark ribbon: a small apricot label and the names in italic
 * display type, with a berry dot BETWEEN names (never after the last).
 *
 * The dot belongs to the item that precedes it and is dropped from the
 * last, so a wrapped line can end on a dot but the list never does.
 */
defineProps<{
  /** The operator's section title; names the band when it has no label. */
  title?: string
  label?: string
  items?: { name: string, href?: string }[]
}>()
</script>

<template>
  <section
    v-if="items?.length"
    :aria-label="label || title"
    class="bg-(--fy-ink-band) text-(--fy-on-ink)"
  >
    <div
      class="
        mx-auto flex w-full max-w-[1280px] flex-wrap items-center
        justify-center gap-x-5 gap-y-2.5 px-6 py-[30px]
      "
    >
      <p
        v-if="label"
        class="
          text-[13px] font-bold tracking-[0.16em] text-(--fy-accent) uppercase
        "
      >
        {{ label }}
      </p>
      <ul
        class="
          flex flex-wrap items-center justify-center gap-x-5 gap-y-2
          font-display text-[length:clamp(20px,1.9vw,26px)] font-medium italic
        "
      >
        <li
          v-for="(item, index) in items"
          :key="item.name"
          class="flex items-center gap-5"
        >
          <PageSectionVariantsEkfyseosfyteiasLink
            v-if="item.href"
            :to="item.href"
            look="plain"
          >
            {{ item.name }}
          </PageSectionVariantsEkfyseosfyteiasLink>
          <template v-else>
            {{ item.name }}
          </template>
          <span
            v-if="index < items.length - 1"
            aria-hidden="true"
            class="block size-2 shrink-0 rounded-full bg-(--fy-accent)"
          />
        </li>
      </ul>
    </div>
  </section>
</template>
