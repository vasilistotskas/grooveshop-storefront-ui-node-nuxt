<script lang="ts" setup>
/**
 * The operator's strip above webside's header, in webside's own look: the
 * accent's pale tint with the heading colour on it, the phone's copy set in
 * bold as the sentence's lead (on a phone it is all the bar says), and the
 * link as a visible «Details» after the sentence rather than the whole bar.
 * An operator who picks a colour in the setting gets that colour as a solid
 * fill instead. It scrolls away with the page; the sticky header stays.
 *
 * Reads the same `announcementBar` setting as the platform's strip
 * (`useAnnouncementBar`), so the wording, phone copy, link, icon, promo
 * code and dismissal behave identically. Rendered on the SERVER and the
 * same for every visitor; `UBanner` remembers a dismissal in localStorage
 * and hides the bar before paint, so it needs no per-visitor render.
 */
const { t } = useStoreI18n('components/variants/webside/Chrome/AnnouncementBar')
const { bar, text, shortText, lead, bannerId } = useAnnouncementBar()
const linkTo = useLinkTo()

/** The tint unless the operator picked a colour: then that colour, solid, with the inverted text Nuxt UI pairs it with. */
const tinted = computed(() => !bar.value?.color)
const link = computed(() => (bar.value?.link ? linkTo(bar.value.link) : undefined))
</script>

<template>
  <UBanner
    v-if="bar"
    :id="bannerId"
    :icon="bar.icon"
    :title="text"
    :color="bar.color"
    :close="bar.dismissible !== false"
    :ui="{
      root: ['z-40', tinted && 'bg-(--ui-secondary-soft)'],
      container: `
        h-10 justify-center
        max-sm:pe-0
      `,
      center: 'justify-center gap-3',
      icon: ['size-4', tinted && 'text-highlighted'],
      // A 44px target on a phone (WCAG 2.5.5): 44px wide, and its hit area
      // reaching 6px above and below the 32px button, so the bar keeps its
      // height. Nothing hangs out sideways (`overhang-is-clipped.spec.ts`).
      close: [
        `
          relative min-w-11 justify-center
          after:absolute after:inset-x-0 after:-inset-y-1.5
          sm:min-w-10
        `,
        tinted && `
          text-highlighted
          hover:bg-(--ui-secondary-soft)
        `,
      ],
      title: [
        `
          flex min-w-0 items-center gap-3 text-sm/5 font-normal
          max-sm:text-[0.8125rem]
        `,
        tinted && 'text-highlighted',
      ],
    }"
  >
    <!-- `title` stays the plain sentence: it is the banner's name, which
         a pair of width-toggled spans would double. -->
    <template #title>
      <span
        class="min-w-0 truncate"
        :class="shortText && 'max-sm:hidden'"
      >
        <template v-if="lead">
          <strong class="font-bold">{{ lead.text }}</strong>{{ lead.rest }}
        </template>
        <template v-else>{{ text }}</template>
      </span>
      <component
        :is="link ? resolveComponent('NuxtLink') : 'span'"
        v-if="shortText"
        :to="link"
        class="
          min-w-0 truncate font-bold
          sm:hidden
        "
      >
        {{ shortText }}
      </component>
      <NuxtLink
        v-if="link"
        :to="link"
        class="
          inline-flex min-h-10 shrink-0 items-center font-semibold
          hover:underline
          focus-visible:outline-2 focus-visible:outline-secondary
        "
        :class="[
          shortText && 'max-sm:hidden',
          tinted ? 'text-accent' : 'underline underline-offset-2',
        ]"
      >{{ t('details') }}</NuxtLink>
      <!-- A light chip on the bar's fill: readable on either ground and
           in both colour modes. -->
      <span
        v-if="bar?.code"
        class="
          shrink-0 rounded-md bg-default px-1.5 py-0.5 font-mono text-xs
          font-bold tracking-[0.04em] text-highlighted
        "
      >{{ bar.code }}</span>
    </template>
  </UBanner>
</template>

<i18n lang="yaml">
el:
  details: Λεπτομέρειες
en:
  details: Details
</i18n>
