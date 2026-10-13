<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The dark quote band: three berry dots, the lead-in text, the quote in
 * italic display type between guillemets, and who said it.
 *
 * The dots are the brand's ornament and carry no meaning, so they are
 * hidden from assistive technology. The section row's `title` is an
 * admin label, not copy, so it is not allowed to fall through onto the
 * band as a tooltip.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  quote?: string
  text?: string
  attribution?: string
}>()
</script>

<template>
  <section
    v-if="quote"
    class="bg-(--fy-ink-band) text-(--fy-on-ink)"
  >
    <figure
      class="
        mx-auto flex w-full max-w-[1280px] flex-col items-center gap-6 px-6
        py-[clamp(64px,8vw,112px)] text-center
      "
    >
      <div
        aria-hidden="true"
        class="flex gap-2.5"
      >
        <span
          v-for="dot in 3"
          :key="dot"
          class="block size-3 rounded-full bg-(--fy-accent)"
        />
      </div>

      <p
        v-if="text"
        class="
          max-w-[40em] text-[18px] leading-[1.65] text-pretty
          text-(--fy-on-ink-muted)
        "
      >
        {{ text }}
      </p>

      <blockquote
        class="
          max-w-[22em] font-display text-[length:clamp(28px,3.4vw,50px)]
          leading-[1.22] font-medium text-balance italic
        "
      >
        «{{ quote }}»
      </blockquote>

      <figcaption
        v-if="attribution"
        class="text-[15px] text-(--fy-on-ink-muted)"
      >
        {{ attribution }}
      </figcaption>
    </figure>
  </section>
</template>
