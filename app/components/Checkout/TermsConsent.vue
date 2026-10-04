<script lang="ts" setup>
/**
 * The checkout's terms consent: one checkbox whose label links to the
 * terms of use and the privacy policy (a new tab, so the cart and the
 * half-filled form stay where they are). The parent gates the order on
 * it and flips `invalid` when the shopper tries to pay without it.
 */
defineProps<{
  /** Show the "you need to accept" message. */
  invalid?: boolean
}>()

const accepted = defineModel<boolean>({ default: false })

const { t } = useI18n()
const localePath = useLocalePath()

const errorId = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <UCheckbox
      v-model="accepted"
      name="terms"
      color="secondary"
      :aria-describedby="invalid ? errorId : undefined"
    >
      <template #label>
        {{ t('before') }}<ULink
          :to="localePath('terms-of-use')"
          target="_blank"
          class="font-medium text-accent underline"
        >{{ t('terms') }}</ULink>{{ t('middle') }}<ULink
          :to="localePath('privacy-policy')"
          target="_blank"
          class="font-medium text-accent underline"
        >{{ t('privacy') }}</ULink>{{ t('after') }}
      </template>
    </UCheckbox>
    <p
      v-if="invalid"
      :id="errorId"
      role="alert"
      class="text-sm text-error"
    >
      {{ t('required') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  before: "Συμφωνώ με τους "
  terms: όρους χρήσης
  middle: " και έχω διαβάσει την "
  privacy: πολιτική απορρήτου
  after: "."
  required: Για να ολοκληρώσεις την παραγγελία, αποδέξου τους όρους χρήσης.
en:
  before: "I agree to the "
  terms: terms of use
  middle: " and have read the "
  privacy: privacy policy
  after: "."
  required: Accept the terms of use to place your order.
</i18n>
