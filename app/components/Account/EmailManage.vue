<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * The shopper's email addresses, as the boards draw them: a section with
 * "Add email", one row per address — the primary one marked — saying
 * whether it is verified, with what can be done to it: resend the
 * verification, make it the primary, remove it. The primary address can
 * be neither removed nor made primary again.
 *
 * Every change is allauth's (`useAllAuthAccount`), and the list is read
 * back from it afterwards.
 */
const {
  getEmailAddresses,
  addEmailAddress,
  requestEmailVerification,
  removeEmailAddress,
  changePrimaryEmailAddress,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()

const { data: addresses, refresh } = await useAsyncData('emailAddresses', () => getEmailAddresses())
const rows = computed(() => addresses.value?.data ?? [])

const busy = ref<string | null>(null)
const adding = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined ? t('validation.required') : t('validation.email.valid'),
  }),
})
const state = reactive<{ email?: string }>({ email: undefined })

async function run(key: string, request: () => Promise<unknown>, done: string, reload = true) {
  busy.value = key
  try {
    await request()
    if (reload) await refresh()
    toast.add({ title: done, color: 'success' })
    return true
  }
  catch (error) {
    handleAllAuthClientError(error)
    return false
  }
  finally {
    busy.value = null
  }
}

async function add(event: FormSubmitEvent<z.output<typeof schema>>) {
  const ok = await run('add', () => addEmailAddress({ email: event.data.email }), t('added'))
  if (ok) {
    adding.value = false
    state.email = undefined
  }
}

const resend = (email: string) => run(`resend:${email}`, () => requestEmailVerification({ email }), t('resent'), false)
const makePrimary = (email: string) => run(`primary:${email}`, () => changePrimaryEmailAddress({ email, primary: true }), t('made_primary'))
const remove = (email: string) => run(`remove:${email}`, () => removeEmailAddress({ email }), t('removed'))
</script>

<template>
  <AccountSection :title="t('title')">
    <template #actions>
      <UButton
        v-if="!adding"
        :label="t('add')"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        @click="() => { adding = true }"
      />
    </template>

    <UForm
      v-if="adding"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-3 sm:flex-row sm:items-start"
      @submit="add"
    >
      <UFormField
        :label="t('new_address')"
        name="email"
        class="flex-1"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          class="w-full"
          autofocus
        />
      </UFormField>
      <div class="flex gap-2 sm:pt-6">
        <UButton
          :label="t('add_submit')"
          :loading="busy === 'add'"
          type="submit"
          color="neutral"
        />
        <UButton
          :label="t('cancel')"
          color="neutral"
          variant="ghost"
          @click="() => { adding = false }"
        />
      </div>
    </UForm>

    <!-- Rows only on the client: the list belongs to the signed-in
         shopper, so nothing is lost on the server render, and a list
         that changes between the server and the client render cannot
         mismatch on hydration. -->
    <ClientOnly>
      <div class="flex flex-col">
        <div
          class="
            grid grid-cols-[2fr_1fr_auto] gap-4 border-b border-default pb-2
            text-xs font-semibold tracking-[0.06em] text-toned uppercase
            max-sm:hidden
          "
          aria-hidden="true"
        >
          <span>{{ t('columns.email') }}</span>
          <span>{{ t('columns.status') }}</span>
          <span class="w-44" />
        </div>
        <ul class="flex flex-col divide-y divide-default">
          <li
            v-for="row in rows"
            :key="row.email"
            class="
              flex flex-col gap-2 py-3 text-sm
              sm:grid sm:grid-cols-[2fr_1fr_auto] sm:items-center sm:gap-4
            "
          >
            <span class="flex min-w-0 flex-wrap items-center gap-2">
              <span class="truncate font-medium text-highlighted">{{ row.email }}</span>
              <UBadge
                v-if="row.primary"
                :label="t('primary')"
                class="bg-inverted text-inverted ring-0"
                size="sm"
              />
            </span>
            <span>
              <span class="sr-only">{{ t('columns.status') }}: </span>
              <UBadge
                :label="row.verified ? t('verified') : t('unverified')"
                :color="row.verified ? 'success' : 'warning'"
                variant="soft"
                size="sm"
              />
            </span>
            <span class="flex w-44 items-center justify-end gap-1 max-sm:w-auto max-sm:justify-start">
              <UButton
                v-if="!row.verified"
                :label="t('resend')"
                :aria-label="t('resend_to', { email: row.email })"
                :loading="busy === `resend:${row.email}`"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => resend(row.email)"
              />
              <UButton
                v-if="row.verified && !row.primary"
                :label="t('make_primary')"
                :aria-label="t('make_primary_named', { email: row.email })"
                :loading="busy === `primary:${row.email}`"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => makePrimary(row.email)"
              />
              <UButton
                v-if="!row.primary"
                :aria-label="t('remove_named', { email: row.email })"
                :loading="busy === `remove:${row.email}`"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => remove(row.email)"
              />
            </span>
          </li>
        </ul>
      </div>
      <template #fallback>
        <USkeleton class="h-12 w-full rounded-[0.75rem]" />
      </template>
    </ClientOnly>
  </AccountSection>
</template>

<i18n lang="yaml">
el:
  title: Διευθύνσεις email
  add: Νέο email
  new_address: Νέα διεύθυνση email
  add_submit: Προσθήκη
  cancel: Άκυρο
  columns:
    email: Email
    status: Κατάσταση
  primary: Κύριο
  verified: Επαληθευμένο
  unverified: Μη επαληθευμένο
  resend: Νέα αποστολή
  resend_to: Νέα αποστολή επαλήθευσης στο {email}
  make_primary: Ορισμός ως κύριο
  make_primary_named: Ορισμός του {email} ως κύριου
  remove_named: Αφαίρεση του {email}
  added: Στείλαμε email επαλήθευσης στη νέα διεύθυνση
  resent: Στείλαμε ξανά το email επαλήθευσης
  made_primary: Το κύριο email άλλαξε
  removed: Η διεύθυνση αφαιρέθηκε
en:
  title: Email addresses
  add: Add email
  new_address: New email address
  add_submit: Add
  cancel: Cancel
  columns:
    email: Email
    status: Status
  primary: Primary
  verified: Verified
  unverified: Unverified
  resend: Resend
  resend_to: Resend the verification to {email}
  make_primary: Make primary
  make_primary_named: Make {email} the primary
  remove_named: Remove {email}
  added: We sent a verification email to the new address
  resent: We sent the verification email again
  made_primary: Your primary email changed
  removed: Address removed
</i18n>
