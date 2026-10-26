<script lang="ts" setup>
/**
 * Webside's terms consent on the payment step: one checkbox whose label
 * links to the terms of use and the privacy policy (a new tab, so the
 * cart and the half-filled form stay where they are). The step gates the
 * order on it (`useCheckoutPaymentSubmit`) and flips `invalid` when the
 * shopper tries to place the order without it.
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
  <div class="space-y-1">
    <UCheckbox
      v-model="accepted"
      name="terms"
      color="primary"
      :aria-describedby="invalid ? errorId : undefined"
      :aria-invalid="invalid || undefined"
      :ui="{ label: 'text-sm' }"
    >
      <template #label>
        {{ t('before') }}<ULink
          :to="localePath('terms-of-use')"
          target="_blank"
          class="
            font-medium text-primary
            hover:underline
          "
        >{{ t('terms') }}</ULink>{{ t('middle') }}<ULink
          :to="localePath('privacy-policy')"
          target="_blank"
          class="
            font-medium text-primary
            hover:underline
          "
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
  required: Για να ολοκληρώσετε την παραγγελία, αποδεχτείτε τους όρους χρήσης.
</i18n>
