<script lang="ts" setup>
const { menus } = useAccountMenus()
const { t } = useI18n({ useScope: 'local' })
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

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="account-header-title"
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
              bg-primary-100 border-primary-500 grid gap-2 rounded-[16px] border
              p-4

              dark:bg-primary-900 dark:border-primary-500
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
                  text-primary-950 text-xl font-semibold capitalize

                  dark:text-primary-50

                  md:text-lg
                "
              :class="{
                'font-extrabold ':
                  route.path === item.route?.path,
              }"
            >
              {{ item.text }}
            </span>
          </LazyAnchor>
        </li>
        <li
          class="
              bg-primary-100 border-primary-500 col-span-2 grid gap-2
              rounded-[16px] border p-4

              dark:bg-primary-900 dark:border-primary-500
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
