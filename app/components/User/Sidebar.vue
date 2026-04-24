<script lang="ts" setup>
defineProps({
  mode: {
    type: String,
    default: 'normal',
  },
})

const { menus } = useAccountMenus()
</script>

<template>
  <div
    id="sidebar"
    :class="[
      {
        'sticky top-18 lg:w-48 xl:w-72': mode === 'normal',
        'relative flex w-full flex-1 flex-col': mode === 'mobile',
      },
    ]"
  >
    <div class="flex-1 overflow-y-auto">
      <UNavigationMenu
        orientation="vertical"
        :items="menus"
        :ui="{
          link: 'gap-4 p-2',
          linkLeadingIcon: 'size-6',
          linkLabel: `
            text-xl font-semibold capitalize
            md:text-lg
          `,
        }"
      />
      <div
        class="
          mt-2 rounded border border-primary-500 bg-primary-100 p-2
          md:border-transparent md:bg-transparent md:p-0
          dark:bg-primary-900
          md:dark:bg-transparent
        "
      >
        <LogoutButton class="ml-2" />
      </div>
    </div>
  </div>
</template>
