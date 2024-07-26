<script lang="ts" setup>
const { menus } = useAccountMenus()
const route = useRoute()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.index.title')"
      class="account-header-title"
    />
    <PageBody>
      <MobileOrTabletOnly>
        <ul
          role="tablist"
          :aria-label="$t('common.menu')"
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
              grid bg-primary-100 gap-2 rounded-[16px] border border-primary-500
              p-4

              dark:bg-primary-900 dark:border-primary-500
            "
          >
            <Anchor
              v-if="item.type === 'link'"
              :to="item.route ? item.route : undefined"
              :text="item.text"
            >
              <UIcon
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
                  'font-extrabold text-sky-500 dark:text-sky-400':
                    route.path === item.route?.path,
                }"
              >
                {{ item.text }}
              </span>
            </Anchor>
          </li>
          <li
            class="
              grid bg-primary-100 col-span-2 gap-2 rounded-[16px] border
              border-primary-500 p-4

              dark:bg-primary-900 dark:border-primary-500
            "
          >
            <LogoutButton
              class="!m-0 ml-2 !p-0"
              variant="link"
              color="white"
              size="xl"
            />
          </li>
        </ul>
      </MobileOrTabletOnly>
    </PageBody>
  </PageWrapper>
</template>
