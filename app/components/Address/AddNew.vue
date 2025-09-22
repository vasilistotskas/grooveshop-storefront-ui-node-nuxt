<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <li
    class="
      relative grid min-h-[160px] place-content-center place-items-center gap-2
      border-2 border-dashed border-primary-500 bg-transparent text-left
      text-base leading-6 font-normal text-primary-600
      md:min-h-[244px] md:gap-8
    "
  >
    <p
      class="
        p-4 text-primary-950
        dark:text-primary-50
      "
    >
      {{ t('title') }}
    </p>
    <div class="grid items-center justify-center">
      <UButton
        class="w-full"
        color="neutral"
        :label="t('button')"
        :to="localePath('account-addresses-new')"
        size="lg"
      />
    </div>
  </li>
</template>

<i18n lang="yaml">
el:
  title: Μπορείς να προσθέσεις μια νέα διεύθυνση και να τη χρησιμοποιήσεις σε
    όλες τις επόμενες αγορές σου.
  button: Προσθήκη
</i18n>
