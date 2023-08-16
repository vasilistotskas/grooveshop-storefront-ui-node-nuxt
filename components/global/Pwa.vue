<script lang="ts" setup>
const { t } = useLang()

const pwa = useNuxtApp().$pwa
</script>
<template>
	<ClientOnly>
		<div v-if="pwa" id="pwa">
			<div v-if="pwa?.offlineReady || pwa?.needRefresh" class="pwa-toast" role="alert">
				<div class="message">
					<span v-if="pwa?.offlineReady" class="text-gray-700 dark:text-gray-200">
						{{ $t('components.global.pwa.ready_to_work_offline') }}
					</span>
					<span v-if="pwa?.needRefresh" class="text-gray-700 dark:text-gray-200">
						{{ $t('components.global.pwa.new_content_available') }}
					</span>
				</div>
				<button
					v-if="pwa?.needRefresh"
					class="text-gray-700 dark:text-gray-200"
					type="button"
					@click="pwa?.updateServiceWorker()"
				>
					{{ $t('components.global.pwa.reload') }}
				</button>
				<button
					type="button"
					class="text-gray-700 dark:text-gray-200"
					@click="pwa?.cancelPrompt()"
				>
					{{ $t('components.global.pwa.close') }}
				</button>
			</div>
			<div
				v-if="pwa?.showInstallPrompt && !pwa?.offlineReady && !pwa?.needRefresh"
				class="pwa-toast"
				role="alert"
			>
				<div class="message">
					<span class="text-gray-700 dark:text-gray-200">
						{{ $t('components.global.pwa.install_pwa') }}
					</span>
				</div>
				<button
					class="text-gray-700 dark:text-gray-200"
					type="button"
					@click="pwa?.install()"
				>
					{{ $t('components.global.pwa.install') }}
				</button>
				<button
					class="text-gray-700 dark:text-gray-200"
					type="button"
					@click="pwa?.cancelInstall()"
				>
					{{ $t('components.global.pwa.cancel') }}
				</button>
			</div>
		</div>
		<template #fallback>
			<ClientOnlyFallback />
		</template>
	</ClientOnly>
</template>

<style lang="scss" scoped>
.pwa-toast {
	position: fixed;
	right: 4rem;
	bottom: 0;
	margin: 16px;
	padding: 12px;
	border: 1px solid #8885;
	border-radius: 4px;
	z-index: 1;
	text-align: left;
	box-shadow: 3px 4px 5px 0 #8885;
}

.pwa-toast .message {
	margin-bottom: 8px;
}

.pwa-toast button {
	border: 1px solid #8885;
	outline: none;
	margin-right: 5px;
	border-radius: 2px;
	padding: 3px 10px;
}
</style>
