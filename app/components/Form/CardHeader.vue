<script lang="ts" setup>
/**
 * The header block of a form card: a round icon badge, a title, and a
 * one-line description.
 *
 * Extracted from `Account/Password/ChangeForm.vue`, which the site
 * owner picked as the reference for every text-entry form on the site
 * ("όπου έχει forms με καταχώρηση πεδίων κειμένου να γίνει όπως αυτό
 * της αλλαγής κωδικού"). That markup was written inline there, so
 * adopting it on four more surfaces by copy-paste would have created
 * five copies of the same twenty lines and guaranteed they drift.
 *
 * Deliberately a header only, not a whole form wrapper. The surfaces
 * that need it differ too much below the header — the checkout step is
 * inside a multi-step flow with its own submit affordance in the
 * sidebar, the address form is a modal, contact is a standalone page —
 * so a component that owned the card, the `UForm`, the fields AND the
 * action row would have needed a prop or slot for every one of those
 * differences. The shared part is the part that is actually shared.
 *
 * @example
 * ```vue
 * <UCard>
 *   <template #header>
 *     <FormCardHeader
 *       icon="i-heroicons-user-circle"
 *       :title="t('title')"
 *       :description="t('description')"
 *     />
 *   </template>
 *   ...
 * </UCard>
 * ```
 */
type BadgeColor
  = | 'primary'
    | 'warning'
    | 'success'
    | 'error'
    | 'info'
    | 'neutral'

const props = withDefaults(defineProps<{
  /** Iconify name for the badge, e.g. `i-heroicons-shield-exclamation`. */
  icon: string
  title: string
  description?: string
  /**
   * Semantic colour of the badge. `primary` for ordinary forms;
   * `warning` for the ones that change security-relevant state, which
   * is what the change-password reference uses.
   */
  color?: BadgeColor
}>(), {
  color: 'primary',
})

// Written out per colour rather than interpolated. Tailwind builds its
// stylesheet by SCANNING source text for complete class names, so
// `bg-${color}/10` produces a class that exists in the DOM and in no
// stylesheet — the badge would render with no background at all, and
// only for whichever colours no other component happened to use.
const BADGE_CLASSES: Record<BadgeColor, { bg: string, icon: string }> = {
  primary: { bg: 'bg-primary/10', icon: 'text-primary' },
  warning: { bg: 'bg-warning/10', icon: 'text-warning' },
  success: { bg: 'bg-success/10', icon: 'text-success' },
  error: { bg: 'bg-error/10', icon: 'text-error' },
  info: { bg: 'bg-info/10', icon: 'text-info' },
  neutral: { bg: 'bg-neutral/10', icon: 'text-neutral' },
}

const badge = computed(() => BADGE_CLASSES[props.color])
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- `min-w-10` alongside `size-10`: inside the header's flex row a
         long title would otherwise shrink the badge into an ellipse.
         Carried over from the reference implementation. -->
    <div
      class="flex size-10 min-w-10 items-center justify-center rounded-full"
      :class="badge.bg"
    >
      <UIcon
        :name="icon"
        class="size-5"
        :class="badge.icon"
      />
    </div>
    <div>
      <h2
        class="
          text-lg font-semibold text-primary-950
          md:text-xl
          dark:text-primary-50
        "
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="
          mt-1 text-sm text-gray-500
          dark:text-gray-200
        "
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>
