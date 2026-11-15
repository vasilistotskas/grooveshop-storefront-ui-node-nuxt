<script lang="ts" setup>
// A share-preview link (`/_builder/preview/<token>?page=<slug>`): the store's
// page drawn from the drafts frozen in the link, for someone without an
// account. The path is set here rather than by the file's place so that the
// editor's own page (`/_builder`) stays a page of its own, not a parent route.
// Not part of the cached storefront: no route rule gives it a cache, so every
// request is private (`isPrivatePageResponse`), and `robots: false` keeps it
// out of indexes and the sitemap.
definePageMeta({
  layout: 'default',
  // Its path is a preview's share token: no sign-in page's address carries it back.
  signInReturn: 'nowhere',
  path: '/_builder/preview/:token',
})
defineRouteRules({
  robots: false,
})

const { t, locale } = useStoreI18n('pages/_builder-preview/[token]')
const route = useRoute()
const tenantStore = useTenantStore()

const token = String(route.params.token)
const page = typeof route.query[BUILDER_SHARE_PAGE_QUERY] === 'string' ? route.query[BUILDER_SHARE_PAGE_QUERY] : 'home'

// The answer is what `POST /api/builder/preview` gives the editor's canvas, so
// it goes where the canvas puts it: `useBuilderPage` and `useNavigation` read
// it from there. It is set before the body is set up (this awaits), and it
// travels in the server payload, so the page hydrates as rendered.
const preview = useBuilderCanvasPreview()
const { data, error } = await useApi<BuilderPreviewResponse>(`/api/builder/shared/${token}`, {
  key: `builder-share-${token}-${page}-${locale.value}`,
  query: { [BUILDER_SHARE_PAGE_QUERY]: page },
})
preview.value = data.value ?? null

const gone = computed(() => error.value !== undefined && error.value !== null)
const body = computed(() => builderShareBody(page))
const component = computed(() => resolvePage(body.value.key, tenantStore.schemaName))

if (import.meta.server && gone.value) {
  setResponseStatus(useRequestEvent()!, error.value?.statusCode === 404 ? 404 : 503)
}
</script>

<template>
  <div>
    <UEmpty
      v-if="gone"
      class="min-h-96"
      icon="i-lucide-link-2-off"
      :title="error?.statusCode === 404 ? t('expired.title') : t('unavailable.title')"
      :description="error?.statusCode === 404 ? t('expired.description') : t('unavailable.description')"
    />
    <template v-else>
      <UAlert
        icon="i-lucide-eye"
        color="neutral"
        variant="subtle"
        :title="t('banner.title')"
        :description="t('banner.description')"
        class="rounded-none"
      />
      <component
        :is="component"
        v-bind="body.props"
      />
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  banner:
    title: Κοινή προεπισκόπηση
    description: Βλέπετε αλλαγές που δεν έχουν δημοσιευτεί ακόμη. Ο σύνδεσμος λήγει και δεν είναι δημόσια σελίδα του καταστήματος.
  expired:
    title: Ο σύνδεσμος δεν ισχύει πια
    description: Ο σύνδεσμος έχει λήξει, έχει ανακληθεί ή η σελίδα δεν υπάρχει. Ζητήστε νέο σύνδεσμο από όποιον σας τον έστειλε.
  unavailable:
    title: Η προεπισκόπηση δεν φορτώθηκε
    description: Δεν ήταν δυνατή η σύνδεση με το κατάστημα. Δοκιμάστε ξανά σε λίγο.
en:
  banner:
    title: Shared preview
    description: You're looking at changes that aren't published yet. The link expires and isn't a public page of the store.
  expired:
    title: This link is no longer valid
    description: The link has expired, was revoked, or the page doesn't exist. Ask whoever sent it for a new one.
  unavailable:
    title: The preview didn't load
    description: The store couldn't be reached. Try again in a moment.
</i18n>
