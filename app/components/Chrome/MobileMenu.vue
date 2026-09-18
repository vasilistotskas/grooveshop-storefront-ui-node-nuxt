<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * The phone menu: the same navigation the header shows on a desk, plus
 * the catalogue as a tree and the controls that do not fit the bar.
 *
 * Loaded lazily and mounted inside `ClientOnly` by the header, so the
 * slideover runtime (`vaul-vue` et al) stays out of every page's eager
 * graph — the reason the header is a hand-rolled element rather than
 * `UHeader` in the first place.
 */
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  items: NavigationMenuItem[]
}>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { loggedIn } = useUserSession()
const { categories, hasCategories } = useCategoryMenu()

/** The catalogue as a `UTree`: roots expand to their children. */
const categoryTree = computed(() =>
  categories.value.map(category => ({
    label: category.label,
    value: category.to,
    defaultExpanded: false,
    children: category.children.length
      ? [
          { label: t('all_in', { category: category.label }), value: category.to },
          ...category.children.map(child => ({
            label: child.label,
            value: child.to,
          })),
        ]
      : undefined,
  })),
)

async function go(path: string) {
  open.value = false
  await navigateTo(localePath(path))
}

// Any navigation closes the panel, including one started from a link
// inside it that this component does not handle itself.
watch(() => route.fullPath, () => {
  open.value = false
})
</script>

<template>
  <USlideover
    v-model:open="open"
    side="left"
    :title="t('menu')"
    :ui="{ content: `
      w-full
      sm:max-w-sm
    `,
           body: 'p-0' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 p-4">
        <UNavigationMenu
          :items="items"
          orientation="vertical"
          :aria-label="t('navigation')"
          :ui="{ link: 'text-base font-medium' }"
        />

        <div v-if="hasCategories">
          <p
            class="
              px-2.5 pb-2 text-xs font-medium tracking-wide text-muted
              uppercase
            "
          >
            {{ t('categories') }}
          </p>
          <UTree
            :items="categoryTree"
            :ui="{ link: 'text-sm' }"
            @update:model-value="(value) => { if (typeof value === 'string') go(value) }"
          />
        </div>

        <USeparator />

        <div class="flex flex-col gap-2">
          <UButton
            :to="localePath(loggedIn ? '/account' : '/account/login')"
            :label="loggedIn ? t('account') : t('login')"
            icon="i-heroicons-user"
            color="neutral"
            variant="subtle"
            size="lg"
            block
          />
          <div class="flex items-center justify-between gap-2 px-1">
            <LazyLanguageSwitcher
              v-if="tenantStore.availableLocales.length > 1"
              hydrate-on-visible
            />
            <UColorModeButton
              color="neutral"
              variant="ghost"
              size="lg"
            />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  menu: Μενού
  navigation: Πλοήγηση
  categories: Κατηγορίες
  all_in: 'Όλα σε {category}'
en:
  menu: Menu
  navigation: Navigation
  categories: Categories
  all_in: 'All in {category}'
</i18n>
