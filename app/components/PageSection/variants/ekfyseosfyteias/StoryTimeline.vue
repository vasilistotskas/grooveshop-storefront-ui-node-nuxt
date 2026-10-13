<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The dark dated list: the heading and its line on the left, and on the
 * right a row per entry between dashed rules, the date in italic apricot
 * display type, then the title and its text. `icon` is not read.
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  items?: Array<{
    title: string
    date?: string
    text?: string
    icon?: string
  }>
}>()
</script>

<template>
  <section
    v-if="items?.length"
    class="bg-(--fy-ink-band) text-(--fy-on-ink)"
  >
    <div
      class="
        mx-auto grid w-full max-w-[1280px] items-center gap-x-[72px] gap-y-12
        px-6 py-[clamp(64px,8vw,112px)]
        grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))]
      "
    >
      <div
        v-if="heading || title || subheading"
        class="flex flex-col gap-4"
      >
        <h2
          v-if="heading || title"
          class="
            font-display text-[length:clamp(38px,4.2vw,62px)] leading-[1.02]
            font-extrabold tracking-[-0.015em] text-balance
          "
        >
          {{ heading || title }}
        </h2>
        <p
          v-if="subheading"
          class="text-[18px] leading-[1.65] text-pretty text-(--fy-on-ink-muted)"
        >
          {{ subheading }}
        </p>
      </div>

      <ol
        class="
          flex flex-col border-b-[1.5px] border-dashed border-(--fy-rule-on-ink)
        "
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          class="
            grid gap-x-6 gap-y-1 border-t-[1.5px] border-dashed
            border-(--fy-rule-on-ink) py-5
            sm:grid-cols-[minmax(110px,1fr)_3fr]
          "
        >
          <span
            v-if="item.date"
            class="
              font-display text-[19px] text-(--fy-accent) italic
              [font-variant-numeric:lining-nums]
            "
          >{{ item.date }}</span>
          <span
            class="flex flex-col gap-1"
            :class="!item.date && 'sm:col-span-2'"
          >
            <strong class="text-[17px] font-bold">{{ item.title }}</strong>
            <span
              v-if="item.text"
              class="text-[15px] leading-[1.55] text-(--fy-on-ink-muted)"
            >{{ item.text }}</span>
          </span>
        </li>
      </ol>
    </div>
  </section>
</template>
