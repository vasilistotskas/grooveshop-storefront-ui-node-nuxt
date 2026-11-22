<script lang="ts" setup>
/**
 * The store's social networks in the footer: a row of round outline
 * icon buttons, the shape of the footer's other controls (the colour-mode
 * select is a pill, the phone's Call and Email are outline buttons).
 * 44px targets on a phone. Renders nothing when the store links none.
 */
const { t } = useStoreI18n('components/Chrome/FooterSocials')

const ORDER = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'pinterest',
  'reddit',
  'discord',
  'linkedin',
] as const satisfies readonly SocialNetwork[]

const { socials } = useStoreSocials(ORDER)
</script>

<template>
  <ul
    v-if="socials.length"
    :aria-label="t('label')"
    class="flex flex-wrap gap-2"
  >
    <li
      v-for="social in socials"
      :key="social.key"
    >
      <UButton
        :to="social.url"
        target="_blank"
        rel="noopener noreferrer"
        :icon="social.icon"
        :aria-label="social.label"
        :title="social.label"
        color="neutral"
        variant="outline"
        size="sm"
        square
        class="
          justify-center rounded-full
          max-sm:min-h-11 max-sm:min-w-11
        "
      />
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  label: Κοινωνικά δίκτυα
en:
  label: Social networks
</i18n>
