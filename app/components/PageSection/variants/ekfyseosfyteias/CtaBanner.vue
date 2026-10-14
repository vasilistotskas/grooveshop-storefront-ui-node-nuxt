<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * One ask in a dashed box: the question on the left, the apricot
 * button on the right. The operator's `backgroundColor` and `surface`
 * are not read: this store's colour roles are fixed, and an arbitrary
 * hex would escape them (and their dark mode).
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  description?: string
  buttonText?: string
  buttonLink?: string
}>()

const label = computed(() => props.heading || props.title)
const hasLink = computed(() => !!(props.buttonText && props.buttonLink))
</script>

<template>
  <section
    v-if="label || description || hasLink"
    class="bg-(--fy-ground)"
  >
    <div
      class="
        mx-auto w-full max-w-[1280px] px-6 pb-[clamp(64px,8vw,112px)]
      "
    >
      <div
        class="
          flex flex-wrap items-center justify-between gap-6 rounded-[32px]
          border-2 border-dashed border-(--fy-text)
          p-[clamp(28px,4vw,56px)]
        "
      >
        <div class="flex max-w-[16em] flex-col gap-3">
          <h2
            v-if="label"
            class="
              font-display text-[length:clamp(30px,3vw,44px)] leading-[1.08]
              font-extrabold text-(--fy-text)
            "
          >
            {{ label }}
          </h2>
          <p
            v-if="description"
            class="text-[18px] leading-[1.65] text-(--fy-text-muted)"
          >
            {{ description }}
          </p>
        </div>

        <PageSectionVariantsEkfyseosfyteiasLink
          v-if="hasLink"
          :to="buttonLink!"
          look="apricot"
          arrow
        >
          {{ buttonText }}
        </PageSectionVariantsEkfyseosfyteiasLink>
      </div>
    </div>
  </section>
</template>
