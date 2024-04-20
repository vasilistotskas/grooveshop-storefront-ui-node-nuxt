<script lang="ts" setup>
const { $pwa } = useNuxtApp()
const isPWAInstalled = computed(() => $pwa?.isPWAInstalled)
</script>

<template>
  <ClientOnly>
    <div v-if="$pwa" id="pwa">
      <div
        v-if="$pwa?.offlineReady || $pwa?.needRefresh"
        class="
          text-primary-600 bg-primary-50 fixed bottom-0 left-0 right-0 z-50
          mx-auto border border-gray-200 px-6 py-4 shadow-xl

          dark:text-primary-400 dark:bg-primary-900 dark:border-gray-700

          sm:bottom-6 sm:left-16 sm:right-16 sm:max-w-5xl sm:rounded-md
        "
        role="alert"
      >
        <div class="message">
          <span
            v-if="$pwa?.offlineReady"
            class="
              text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            {{ $t('components.pwa.ready_to_work_offline') }}
          </span>
          <span
            v-if="$pwa?.needRefresh"
            class="
              text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            {{ $t('components.pwa.new_content_available') }}
          </span>
        </div>
        <button
          v-if="$pwa?.needRefresh"
          class="
            text-primary-950

            dark:text-primary-50
          "
          type="button"
          @click="$pwa?.updateServiceWorker()"
        >
          {{ $t('components.pwa.reload') }}
        </button>
        <button
          type="button"
          class="
            text-primary-950

            dark:text-primary-50
          "
          @click="$pwa?.cancelPrompt()"
        >
          {{ $t('components.pwa.close') }}
        </button>
      </div>
      <div
        v-if="
          $pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh
        "
        class="
          bg-primary-100 fixed bottom-0 right-16 mb-4 rounded border
          border-gray-200 p-3 shadow-md

          dark:bg-primary-900

          sm:flex sm:gap-2 sm:text-center
        "
        role="alert"
      >
        <div
          class="
            mb-2

            sm:align-center sm:mb-0 sm:grid sm:w-full sm:items-center
            sm:justify-center
          "
        >
          <span
            class="
              text-primary-950 text-center capitalize

              dark:text-primary-50
            "
          >
            {{ $t('components.pwa.install_pwa') }}
          </span>
        </div>
        <div
          class="
            ml-auto mt-4 flex flex-col gap-2

            lg:mt-0

            md:flex-row-reverse

            sm:m-0 sm:flex sm:w-full sm:flex-row
          "
        >
          <button
            type="button"
            class="
              text-primary-950 bg-primary-50 whitespace-nowrap rounded-lg border
              border-gray-200 px-3 py-2 text-sm font-medium transition
              duration-150 ease-in-out

              dark:text-primary-400 dark:bg-primary-900
              dark:hover:bg-primary-700 dark:border-gray-600
              dark:hover:text-white dark:focus:ring-gray-700

              focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200

              hover:text-primary-950 hover:bg-primary-50

              md:px-5 md:py-2.5

              sm:m-0
            "
            @click="$pwa?.install()"
          >
            {{ $t('components.pwa.install') }}
          </button>
          <button
            type="button"
            class="
              text-primary-950 bg-primary-50 whitespace-nowrap rounded-lg border
              border-gray-200 px-3 py-2 text-sm font-medium transition
              duration-150 ease-in-out

              dark:text-primary-400 dark:bg-primary-900
              dark:hover:bg-primary-700 dark:border-gray-600
              dark:hover:text-white dark:focus:ring-gray-700

              focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200

              hover:text-primary-950 hover:bg-primary-50

              md:px-5 md:py-2.5

              sm:m-0
            "
            @click="$pwa?.cancelInstall()"
          >
            {{ $t('components.pwa.cancel') }}
          </button>
        </div>
      </div>
    </div>
    <UAlert
      v-else-if="isPWAInstalled"
      :description="$t('components.pwa.pwa_installed')"
      :title="$t('components.pwa.pwa_installed_title')"
    />
    <template #fallback>
      <ClientOnlyFallback class="pwa-toast" />
    </template>
  </ClientOnly>
</template>
