<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <UCard
    class="
      rounded-xl p-8 ring-1 ring-gray-200
      sm:p-12
      dark:bg-gray-900 dark:ring-gray-800
    "
  >
    <div
      class="
        flex flex-col items-center justify-center gap-6 text-center
        md:gap-8
      "
    >
      <div
        class="
          flex size-20 items-center justify-center rounded-full bg-primary-100
          dark:bg-primary-900/30
        "
      >
        <UIcon
          name="i-heroicons-map-pin"
          class="
            size-10 text-primary-600
            dark:text-primary-400
          "
        />
      </div>

      <div class="max-w-md space-y-3">
        <h3
          class="
            text-xl font-bold text-gray-900
            sm:text-2xl
            dark:text-gray-100
          "
        >
          {{ t('title') }}
        </h3>
        <p
          class="
            text-sm text-gray-600
            sm:text-base
            dark:text-gray-200
          "
        >
          {{ t('description') }}
        </p>
      </div>

      <ul
        class="
          space-y-2 text-left text-sm text-gray-700
          dark:text-gray-300
        "
      >
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check-circle"
            class="
              size-5 shrink-0 text-green-600
              dark:text-green-400
            "
          />
          <span>{{ t('benefit1') }}</span>
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check-circle"
            class="
              size-5 shrink-0 text-green-600
              dark:text-green-400
            "
          />
          <span>{{ t('benefit2') }}</span>
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check-circle"
            class="
              size-5 shrink-0 text-green-600
              dark:text-green-400
            "
          />
          <span>{{ t('benefit3') }}</span>
        </li>
      </ul>

      <UButton
        color="neutral"
        variant="subtle"
        size="xl"
        icon="i-heroicons-plus"
        :label="t('button')"
        :to="localePath('account-addresses-new')"
        class="mt-2"
      />
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  title: Δεν έχεις καμία διεύθυνση
  description: Μπορείς να προσθέσεις μια νέα διεύθυνση και να τη χρησιμοποιήσεις σε όλες τις επόμενες αγορές σου.
  benefit1: Ταχύτερη ολοκλήρωση παραγγελίας
  benefit2: Αποθήκευση πολλαπλών διευθύνσεων
  benefit3: Αυτόματη συμπλήρωση στοιχείων
  button: Προσθήκη Διεύθυνσης
</i18n>
