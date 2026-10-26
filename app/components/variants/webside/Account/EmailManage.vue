<script lang="ts" setup>
import type * as z from 'zod'
import type { TableColumn, DropdownMenuItem } from '#ui/types'

const { t } = useI18n()

const { rows: data, busy, schema: emailFormZodSchema, add: addEmail, resend: emailVerificationRequest, makePrimary: markAsPrimaryEmail, remove: removeEmail } = await useEmailAddresses({
  messages: () => ({
    added: t('email.added'),
    resent: t('email.verification_requested'),
    madePrimary: t('email.marked_as_primary'),
    removed: t('email.removed'),
  }),
})

const loading = computed(() => busy.value !== null)

const formSchema = computed(() => ({
  fields: [
    {
      label: t('email.title'),
      name: 'email',
      as: 'input',
      rules: emailFormZodSchema.shape.email,
      ui: {
        root: 'w-full',
      },
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('email.title'),
      condition: () => true,
      disabledCondition: () => false,
      type: 'email',
    },
  ],
} as const satisfies DynamicFormSchema))

async function onAddEmail(values: z.infer<typeof emailFormZodSchema>) {
  await addEmail(values.email)
}

const columns: TableColumn<EmailAddress>[] = [
  {
    accessorKey: 'email',
    header: t('email.title'),
  },
  {
    accessorKey: 'verified',
    header: t('verified'),
  },
  {
    accessorKey: 'primary',
    header: t('primary'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const actionItems = (row: { email: string, verified: boolean, primary: boolean }): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[] = []
  if (!row.primary) {
    items.push({
      label: t('email.mark_as_primary'),
      icon: 'i-heroicons-star-20-solid',
      onSelect: () => markAsPrimaryEmail(row.email),
    })
    items.push({
      label: t('email.remove'),
      icon: 'i-heroicons-trash-20-solid',
      onSelect: () => removeEmail(row.email),
    })
  }
  if (!row.verified) {
    items.push({
      label: t('email.request_verification'),
      icon: 'i-heroicons-mail-20-solid',
      onSelect: () => emailVerificationRequest(row.email),
    })
  }
  return items.length ? [items] : []
}
</script>

<template>
  <div
    class="
      grid gap-4
      md:gap-12
    "
  >
    <!-- ClientOnly: this table's rows come from the auth store,
         which `plugins/setup.ts` fills from a `watch(loggedIn)`
         that fires when nuxt-auth-utils re-fetches the session on
         `app:suspense:resolve` — the hydration boundary itself.
         The server therefore renders the empty state and the
         client renders the real rows in the same pass, which Vue
         reports as a hydration mismatch (measured: 1 row server,
         35 client). ClientOnly renders nothing on the server AND
         nothing during hydration, so the first client render
         matches by construction and the rows arrive as an
         ordinary update. These pages are authenticated and never
         cached or indexed, so there is no SSR content to lose. -->
    <ClientOnly>
      <UTable
        :columns="columns"
        :data="data"
      >
        <template #actions-cell="{ row }">
          <!-- `UDropdownMenu`, not `UDropdownMenu`. Reka's
                     `useForwardExpose` reads `t.value.$el.nodeName` after
                     checking only that `$el` EXISTS as a key, and a Lazy
                     component's `$el` is null until it loads — so every
                     row threw "Cannot read properties of null (reading
                     'nodeName')" and the page hydrated with mismatches.
                     The lazy wrapper bought nothing either: the navbar
                     renders UDropdownMenu eagerly on every page. -->
          <UDropdownMenu
            v-if="actionItems(row.original).length > 0"
            :items="actionItems(row.original)"
          >
            <UButton
              color="neutral"
              icon="i-heroicons-ellipsis-horizontal-20-solid"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
        <template #verified-cell="{ row }">
          <UIcon
            :class="row.original.verified ? `
              text-green-500
              dark:text-green-400
            ` : `
              text-red-500
              dark:text-red-400
            `"
            :name="row.original.verified ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
            class="size-6"
          />
        </template>
        <template #primary-cell="{ row }">
          <UIcon
            :class="row.original.primary ? `
              text-green-500
              dark:text-green-400
            ` : `
              text-red-500
              dark:text-red-400
            `"
            :name="row.original.primary ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
            class="size-6"
          />
        </template>
      </UTable>
    </ClientOnly>

    <div class="grid">
      <h2
        class="
          text-center text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('email.add') }}
      </h2>
      <div
        class="
          container mx-auto p-0
          md:px-6
        "
      >
        <section class="grid items-center">
          <DynamicForm
            :button-label="t('submit')"
            :loading="loading"
            :reset-on-submit="true"
            :schema="formSchema"
            @submit="onAddEmail"
          />
        </section>
      </div>
    </div>
  </div>
</template>
