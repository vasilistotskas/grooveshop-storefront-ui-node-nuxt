<script lang="ts" setup>
/**
 * The other ways to reach the store: its phone, its email, and where its
 * offices are. Every line is the merchant's own data (the published
 * identity and `STORE_OFFICES`); a store that has published none of it
 * renders no card rather than an empty one.
 */
const { t } = useStoreI18n('components/Contact/MethodsCard')
const { phone, email, places, todayHours, hasAny } = useContactMethods()
</script>

<template>
  <section
    v-if="hasAny"
    :aria-label="t('title')"
    class="
      rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <ul class="flex flex-col gap-4">
      <li
        v-if="phone"
        class="flex items-center gap-4"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated">
          <UIcon
            name="i-lucide-smartphone"
            class="size-5 text-highlighted"
            aria-hidden="true"
          />
        </span>
        <div class="flex min-w-0 flex-col">
          <a
            :href="`tel:${phone}`"
            class="
              font-semibold text-highlighted
              hover:underline
            "
          >{{ phone }}</a>
          <span
            v-if="todayHours"
            class="text-sm text-toned"
          >
            {{ t('today', { opens: todayHours.opens, closes: todayHours.closes }) }}
          </span>
        </div>
      </li>

      <li
        v-if="email"
        class="flex items-center gap-4"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated">
          <UIcon
            name="i-lucide-mail"
            class="size-5 text-highlighted"
            aria-hidden="true"
          />
        </span>
        <a
          :href="`mailto:${email}`"
          class="
            min-w-0 font-semibold break-all text-highlighted
            hover:underline
          "
        >{{ email }}</a>
      </li>

      <li
        v-for="place in places"
        :key="place.key"
        class="flex items-center gap-4"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated">
          <UIcon
            name="i-lucide-map-pin"
            class="size-5 text-highlighted"
            aria-hidden="true"
          />
        </span>
        <div class="flex min-w-0 flex-col">
          <span class="font-semibold text-highlighted">{{ place.title }}</span>
          <span
            v-if="place.detail"
            class="text-sm text-toned"
          >{{ place.detail }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Στοιχεία επικοινωνίας
  today: 'Σήμερα {opens}–{closes}'
en:
  title: Contact details
  today: 'Today {opens}–{closes}'
</i18n>
