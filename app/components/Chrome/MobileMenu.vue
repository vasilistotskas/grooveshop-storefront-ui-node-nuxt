<script lang="ts" setup>
import type { NavigationMenuItem, TreeItem } from '@nuxt/ui'

/**
 * The phone menu: the shopper's account, the catalogue as a tree, the
 * rest of the header's navigation, and the controls that do not fit
 * the bar.
 *
 * Loaded lazily and mounted inside `ClientOnly` by the header, so the
 * slideover runtime (`vaul-vue` et al) stays out of every page's eager
 * graph — the reason the header is a hand-rolled element rather than
 * `UHeader` in the first place. The body only mounts while the panel is
 * open, so the account card's loyalty request is made when the menu is,
 * not on every page.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  items: NavigationMenuItem[]
}>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { loggedIn } = useUserSession()
const { categories, hasCategories } = useCategoryMenu()

/**
 * The catalogue as a `UTree`. A branch opens on "All in" its category,
 * then its children; a leaf goes to its category. Each leaf carries its
 * own `onSelect` because a tree's selection is the item object, and a
 * branch carries none so that picking it only opens it.
 */
const categoryTree = computed<TreeItem[]>(() =>
  categories.value.map((category) => {
    if (!category.children.length) {
      return { label: category.label, value: category.to, onSelect: () => go(category.to) }
    }
    const child = (label: string, to: string): TreeItem => ({
      label,
      value: to,
      class: 'h-10 font-medium',
      onSelect: () => go(to),
    })
    return {
      label: category.label,
      value: category.to,
      children: [
        child(t('all_in', { category: category.label }), category.to),
        ...category.children.map(entry => child(entry.label, entry.to)),
      ],
    }
  }),
)

/** The header's entries after the catalogue, which the tree replaces. */
const links = computed(() => props.items.filter(item => !item.children))

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
    :ui="{
      content: 'w-85 max-w-[calc(100vw-3rem)]',
      header: 'min-h-15 border-b border-default py-0 ps-4 pe-2',
      body: `
        p-4
        sm:p-4
      `,
      footer: 'grid grid-cols-2 gap-2 border-t border-default px-4 py-3.5',
    }"
  >
    <template #title>
      <TenantLogo
        :width="132"
        :height="30"
      />
      <span class="sr-only">{{ t('menu') }}</span>
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <ChromeMobileMenuAccount v-if="loggedIn" />
        <UButton
          v-else
          :to="localePath('/account/login')"
          :label="t('login')"
          block
        />

        <template v-if="hasCategories">
          <p class="text-xs font-bold tracking-wider text-muted uppercase">
            {{ t('shop') }}
          </p>
          <UTree
            :items="categoryTree"
            color="neutral"
            size="lg"
            :ui="{
              listWithChildren: 'ms-4 border-s-0',
              itemWithChildren: 'ms-0 ps-0',
              // A category row is text and a chevron: no folder icons.
              // (An empty `#item-leading` slot cannot drop them — Vue
              // renders a slot's fallback when the slot renders nothing.)
              linkLeadingIcon: 'hidden',
              link: `
                h-11 rounded-sm px-3.5 text-[0.9375rem] font-semibold text-toned
                before:rounded-sm
                data-expanded:before:bg-muted
              `,
            }"
          />
        </template>

        <template v-if="links.length">
          <USeparator />
          <UNavigationMenu
            :items="links"
            orientation="vertical"
            color="neutral"
            :aria-label="t('navigation')"
            :ui="{ link: 'px-0 py-1.5 text-base font-bold text-default' }"
          />
        </template>
      </div>
    </template>

    <template #footer>
      <LanguageSwitcher
        v-if="tenantStore.availableLocales.length > 1"
        class="w-full"
      />
      <UColorModeSelect
        color="neutral"
        size="sm"
        class="w-full"
        :ui="{ base: 'rounded-full font-semibold' }"
      />
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  menu: Μενού
  navigation: Πλοήγηση
  all_in: 'Όλα σε {category}'
en:
  menu: Menu
  navigation: Navigation
  all_in: 'All in {category}'
</i18n>
