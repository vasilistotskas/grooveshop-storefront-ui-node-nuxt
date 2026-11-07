<script lang="ts" setup>
/**
 * The other ways to reach the store, beside webside's contact form: its
 * phone, its email and where its offices are, in the form's own `UCard`.
 * Every line is the merchant's own data (the published identity and
 * `STORE_OFFICES`); a store that has published none of it renders no card
 * rather than an empty one.
 */
const { t } = useStoreI18n('components/variants/webside/Contact/MethodsCard')
const { phone, email, places, todayHours, hasAny } = useContactMethods()
</script>

<template>
  <UCard
    v-if="hasAny"
    as="section"
    :aria-label="t('title')"
    class="shadow-lg"
  >
    <template #header>
      <h2
        class="
          text-lg font-semibold text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('title') }}
      </h2>
    </template>

    <ul class="flex flex-col gap-4">
      <li
        v-if="phone"
        class="flex items-center gap-3"
      >
        <UIcon
          name="i-heroicons-phone"
          class="
            size-6 shrink-0 text-primary-600
            dark:text-primary-300
          "
          aria-hidden="true"
        />
        <div class="flex min-w-0 flex-col">
          <a
            :href="`tel:${phone}`"
            class="
              font-semibold text-primary-950
              hover:underline
              dark:text-primary-50
            "
          >{{ phone }}</a>
          <span
            v-if="todayHours"
            class="
              text-sm text-primary-600
              dark:text-primary-300
            "
          >
            {{ t('today', { opens: todayHours.opens, closes: todayHours.closes }) }}
          </span>
        </div>
      </li>

      <li
        v-if="email"
        class="flex items-center gap-3"
      >
        <UIcon
          name="i-heroicons-envelope"
          class="
            size-6 shrink-0 text-primary-600
            dark:text-primary-300
          "
          aria-hidden="true"
        />
        <a
          :href="`mailto:${email}`"
          class="
            min-w-0 font-semibold break-all text-primary-950
            hover:underline
            dark:text-primary-50
          "
        >{{ email }}</a>
      </li>

      <li
        v-for="place in places"
        :key="place.key"
        class="flex items-center gap-3"
      >
        <UIcon
          name="i-heroicons-map-pin"
          class="
            size-6 shrink-0 text-primary-600
            dark:text-primary-300
          "
          aria-hidden="true"
        />
        <div class="flex min-w-0 flex-col">
          <span
            class="
              font-semibold text-primary-950
              dark:text-primary-50
            "
          >{{ place.title }}</span>
          <span
            v-if="place.detail"
            class="
              text-sm text-primary-600
              dark:text-primary-300
            "
          >{{ place.detail }}</span>
        </div>
      </li>
    </ul>
  </UCard>
</template>

<i18n lang="yaml">
el:
  title: Στοιχεία επικοινωνίας
  today: 'Σήμερα {opens}–{closes}'
en:
  title: Contact details
  today: 'Today {opens}–{closes}'
</i18n>
