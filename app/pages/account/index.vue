<script lang="ts" setup>
const { menus } = useAccountMenus()
const { t } = useI18n()
const route = useRoute()
const { $i18n } = useNuxtApp()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="
        account-header-title
        md:mt-0
      "
    />

    <MobileOrTabletOnly>
      <ul
        role="tablist"
        :aria-label="$i18n.t('menu')"
        class="
          grid grid-cols-2 gap-3
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        <li
          v-for="(item, i) in menus"
          :key="i"
          class="
            grid gap-2 rounded-[16px] border border-primary-500 bg-primary-100
            p-4
            dark:border-primary-500 dark:bg-primary-900
          "
        >
          <LazyAnchor
            v-if="item.route && item.type === 'link'"
            :to="item.route"
            :text="item.text"
            class="flex items-center gap-2"
          >
            <LazyUIcon
              v-if="item.icon"
              :name="item.icon"
              class="
                text-2xl
                md:text-xl
              "
            />
            <span
              class="
                text-xl font-semibold text-primary-950 capitalize
                md:text-lg
                dark:text-primary-50
              "
              :class="{
                'font-extrabold':
                  route.path === item.route?.path,
              }"
            >
              {{ item.text }}
            </span>
          </LazyAnchor>
        </li>
        <li
          class="
            col-span-2 grid gap-2 rounded-[16px] border border-primary-500
            bg-primary-100 p-4
            dark:border-primary-500 dark:bg-primary-900
          "
        >
          <LogoutButton
            class="!m-0 ml-2 !p-0"
            variant="link"
            size="xl"
          />
        </li>
      </ul>
    </MobileOrTabletOnly>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Λογαριασμός
</i18n>
