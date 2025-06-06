<script lang="ts" setup>
defineProps({
  mode: {
    type: String,
    default: 'normal',
  },
})

const route = useRoute()

const { menus } = useAccountMenus()

const sidebar = ref(null)
onMounted(() => {
  if (!sidebar.value) return
  const { onScroll } = useSticky(sidebar.value as HTMLElement, 150)
  setTimeout(() => onScroll(), 50)
})
</script>

<template>
  <div
    ref="sidebar"
    :class="[
      {
        'transition-all duration-300 ease-in-out': true,
        'sidebar lg:w-30 lg:flex md:hidden md:h-fit xl:w-60': mode === 'normal',
        'relative flex w-full flex-1 flex-col': mode === 'mobile',
        'relative grid w-full': route.path === '/account',
      },
    ]"
  >
    <div class="flex-1 overflow-y-auto">
      <ul
        class="
          grid

          md:gap-2
        "
      >
        <li
          v-for="(item, i) in menus"
          :key="i"
          class="
            bg-primary-100 border-primary-500 rounded border p-2

            dark:bg-primary-900

            md:border-transparent md:bg-transparent md:p-0
            md:dark:bg-transparent
          "
        >
          <LazyAnchor
            v-if="item.route && item.type === 'link'"
            :to="item.route"
            :text="item.text"
            :class="{
              'group flex items-center gap-4 p-2 hover:no-underline': true,
              'rounded-lg bg-primary-100 dark:bg-primary-900': route.path === item.route?.path,
            }"
          >
            <LazyUIcon
              v-if="item.icon"
              :name="item.icon"
              class="size-6"
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
          <Anchor
            v-else-if="item.type === 'external-link'"
            :href="item.href"
            :text="item.text"
            class="
              group flex items-center gap-4 p-2

              hover:no-underline
            "
          >
            <div
              class="
                flex items-center rounded-md p-1 shadow-sm ring-1
                ring-slate-900/5

                dark:group-hover:highlight-white/10 dark:highlight-white/10
                dark:shadow-none dark:ring-0 dark:group-hover:shadow-none

                group-hover:shadow group-hover:shadow-sky-200
                group-hover:ring-slate-900/10
              "
              :class="{
                'text-primary-50 bg-secondary dark:text-primary-50':
                  item.route?.path === route.path,
                'bg-primary-100 text-slate-500 dark:text-primary-50 dark:bg-primary-900 dark:group-hover:bg-primary-600 group-hover:bg-primary-200':
                  item.route?.path !== route.path,
              }"
            >
              <Component
                :is="item.icon"
                class="
                  text-2xl

                  md:text-xl
                "
              />
            </div>
            <span
              class="
                text-primary-950 text-xl font-semibold capitalize

                dark:text-primary-50

                md:text-lg
              "
              :class="{
                'font-extrabold ':
                  item.route?.path === route.path,
              }"
            >
              {{ item.text }}
            </span>
          </Anchor>
        </li>
        <li
          class="
            bg-primary-100 border-primary-500 rounded border p-2

            dark:bg-primary-900

            md:border-transparent md:bg-transparent md:p-0
            md:dark:bg-transparent
          "
        >
          <LogoutButton class="ml-2" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  &.sticky {
    top: 4.5rem;
  }
}
</style>
