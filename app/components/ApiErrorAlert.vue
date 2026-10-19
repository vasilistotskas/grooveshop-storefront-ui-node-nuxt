<script lang="ts" setup>
/**
 * A failure that blocks a step, shown in place until the shopper acts again
 * (checkout, payment): a toast times out, and a shopper who looked away
 * would not know why «Pay» did nothing. The reason is the server's; the
 * stable code and the request id sit behind «Λεπτομέρειες».
 */
const props = defineProps<{
  error: DescribedApiError | null
  /** The headline; the generic error title otherwise. */
  title?: string
}>()

const { t } = useI18n()
const open = ref(false)
const details = computed(() => [
  props.error?.code ? `${t('error.code_label')}: ${props.error.code}` : '',
  props.error?.requestId ? `${t('error.request_id_label')}: ${props.error.requestId}` : '',
].filter(Boolean))
</script>

<template>
  <UAlert
    v-if="error"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    role="alert"
    :title="title ?? error.title"
    :description="error.description"
  >
    <template v-if="details.length" #actions>
      <UCollapsible v-model:open="open">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          :label="t('error.details')"
          :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        />
        <template #content>
          <p
            v-for="line in details"
            :key="line"
            class="font-mono text-xs break-all"
          >
            {{ line }}
          </p>
        </template>
      </UCollapsible>
    </template>
  </UAlert>
</template>
