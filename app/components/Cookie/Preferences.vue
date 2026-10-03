<script setup lang="ts">
/**
 * The cookie preferences: one switch per group (`utils/cookieGroups.ts`),
 * the necessary groups on and locked. Switches only change the working
 * choice; nothing is decided until "Save choices" or "Reject optional" —
 * a switch flipped and abandoned must not grant anything.
 */
import type { CookieGroup } from '~/utils/cookieGroups'

const { t } = useI18n()
const { cookiesEnabledIds, isModalActive, moduleOptions } = useCookieControl()
const { necessaryOnly, save } = useCookieConsent()

const groups = cookieGroups(moduleOptions.cookies)
const optionalIds = new Set(moduleOptions.cookies.optional.map(cookie => cookie.id))

// The working choice starts from the decision on record; a first visit
// has none, so every optional group starts off.
const chosen = ref(new Set((cookiesEnabledIds.value ?? []).filter(id => optionalIds.has(id))))

const isOn = (group: CookieGroup) => group.locked || group.ids.every(id => chosen.value.has(id))

function toggle(group: CookieGroup, on: boolean) {
  const next = new Set(chosen.value)
  for (const id of group.ids) {
    if (on) next.add(id)
    else next.delete(id)
  }
  chosen.value = next
}

const label = (group: CookieGroup) => group.cookie ? t(group.cookie.name) : t(`groups.${group.key}.label`)
const description = (group: CookieGroup) => {
  const text = group.cookie ? t(group.cookie.description ?? '') : t(`groups.${group.key}.description`)
  return group.locked ? `${text} ${t('always_on')}` : text
}

function close() {
  isModalActive.value = false
}
</script>

<template>
  <UModal
    v-model:open="isModalActive"
    :title="t('title')"
    :description="t('description')"
    :ui="{
      // Centred on a wide screen; on a phone it rises from the bottom,
      // where the banner that opened it sat.
      content: `
        max-w-140 rounded-[1.375rem]
        max-sm:top-auto max-sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]
        max-sm:translate-y-0
      `,
      header: 'border-b border-default px-6 py-5',
      title: 'font-display text-[1.375rem] font-bold',
      description: 'sr-only',
      body: `
        p-6
        sm:p-6
      `,
      footer: 'justify-end gap-2.5 border-t border-default bg-muted px-6 py-4',
    }"
  >
    <template #body>
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="group in groups"
          :key="group.key"
          class="
            py-4.5
            first:pt-0
            last:pb-0
          "
        >
          <USwitch
            :model-value="isOn(group)"
            :disabled="group.locked"
            color="secondary"
            :label="label(group)"
            :description="description(group)"
            :ui="{
              root: 'flex-row-reverse items-center justify-between gap-4',
              wrapper: 'ms-0',
              label: 'text-[0.9375rem] font-bold text-highlighted',
              description: 'text-[0.8125rem] text-muted',
            }"
            @update:model-value="(on: boolean) => toggle(group, on)"
          />
        </li>
      </ul>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('reject_optional')"
        @click="() => { necessaryOnly(); close() }"
      />
      <UButton
        color="primary"
        :label="t('save')"
        @click="() => { save([...chosen]); close() }"
      />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Προτιμήσεις cookies
  description: Διάλεξε ποιες κατηγορίες cookies επιτρέπεις. Μπορείς να αλλάξεις την επιλογή σου όποτε θέλεις από το κάτω μέρος κάθε σελίδας.
  always_on: Πάντα ενεργά.
  reject_optional: Απόρριψη προαιρετικών
  save: Αποθήκευση επιλογών
  groups:
    necessary:
      label: Απαραίτητα
      description: Καλάθι, ολοκλήρωση αγοράς και σύνδεση.
    functionality:
      label: Λειτουργικότητα
      description: Θυμούνται τη γλώσσα και τις προτιμήσεις σου.
    analytics:
      label: Στατιστικά
      description: Ανώνυμα στατιστικά για το πώς χρησιμοποιείται το κατάστημα.
    advertising:
      label: Διαφήμιση
      description: Μέτρηση και εξατομίκευση διαφημίσεων.
    personalization:
      label: Εξατομίκευση
      description: Προτάσεις με βάση όσα βλέπεις.
    security:
      label: Ασφάλεια
      description: Πρόληψη απάτης και προστασία του λογαριασμού σου.
en:
  title: Cookie preferences
  description: Choose which kinds of cookies you allow. You can change your choice at any time from the bottom of every page.
  always_on: Always on.
  reject_optional: Reject optional
  save: Save choices
  groups:
    necessary:
      label: Necessary
      description: Cart, checkout and sign-in.
    functionality:
      label: Functionality
      description: Remember your language and preferences.
    analytics:
      label: Analytics
      description: Anonymised statistics on how the shop is used.
    advertising:
      label: Advertising
      description: Measuring and personalising ads.
    personalization:
      label: Personalisation
      description: Recommendations based on what you browse.
    security:
      label: Security
      description: Fraud prevention and protecting your account.
</i18n>
