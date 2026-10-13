<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The header most bands of this tenant open with: a small uppercase
 * eyebrow and the h2 on the left, the lead paragraph and the text link
 * on the right. With neither a lead nor a link it is just the left
 * column.
 *
 * `tone` is the ground it sits on. Bark is never text on sage (4.38:1),
 * so the lead takes the ink role there, and the eyebrow its
 * sage-specific olive.
 */
const props = withDefaults(defineProps<{
  eyebrow?: string
  heading?: string
  lead?: string
  ctaText?: string
  ctaLink?: string
  tone?: 'paper' | 'sage'
}>(), {
  tone: 'paper',
})

const hasAside = computed(() => !!(props.lead || (props.ctaText && props.ctaLink)))
</script>

<template>
  <div
    v-if="eyebrow || heading || hasAside"
    class="grid items-end gap-x-16 gap-y-6"
    :class="hasAside
      ? 'grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]'
      : 'grid-cols-1'"
  >
    <div class="flex flex-col gap-3.5">
      <p
        v-if="eyebrow"
        class="text-[13px] font-bold tracking-[0.16em] uppercase"
        :class="tone === 'sage' ? 'text-(--fy-eyebrow-on-sage)' : 'text-(--fy-eyebrow)'"
      >
        {{ eyebrow }}
      </p>
      <h2
        v-if="heading"
        class="
          font-display text-[length:clamp(38px,4.2vw,62px)] leading-[1.02]
          font-extrabold tracking-[-0.015em] text-balance text-(--fy-text)
        "
      >
        {{ heading }}
      </h2>
    </div>

    <div
      v-if="hasAside"
      class="flex flex-col items-start gap-4"
    >
      <p
        v-if="lead"
        class="text-[18px] leading-[1.65] text-pretty"
        :class="tone === 'sage' ? 'text-(--fy-text)' : 'text-(--fy-text-muted)'"
      >
        {{ lead }}
      </p>
      <PageSectionVariantsEkfyseosfyteiasLink
        v-if="ctaText && ctaLink"
        :to="ctaLink"
        arrow
      >
        {{ ctaText }}
      </PageSectionVariantsEkfyseosfyteiasLink>
    </div>
  </div>
</template>
