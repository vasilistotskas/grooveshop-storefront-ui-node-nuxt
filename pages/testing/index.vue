<script lang="ts" setup>
import { WebsocketMessageData } from '~/types/websocket'

definePageMeta({
	layout: 'testing'
})

const config = useRuntimeConfig()

let ws: WebSocket
onMounted(() => {
	const websocketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
	const djangoApiHost = config.public.djangoHost
	const wsEndpoint = `${websocketProtocol}://${djangoApiHost}/ws/notifications/`
	ws = new WebSocket(wsEndpoint)
	ws.onmessage = (event: MessageEvent<WebsocketMessageData>) => {
		// eslint-disable-next-line no-console
		console.log(
			'event',
			event,
			event.data.users,
			event.data.isRead,
			event.data.link,
			event.data.kind,
			event.data.translations
		)
	}

	ws.onopen = (event) => {
		// eslint-disable-next-line no-console
		console.log('WebSocket connection opened!', event)
	}

	ws.onclose = (event) => {
		// eslint-disable-next-line no-console
		console.log('WebSocket connection closed!', event)
	}
})
const sendMessage = () => {
	ws.send('hello')
}
</script>

<template>
	<PageWrapper class="container mt-1 min-h-full">
		<PageHeader>
			<PageTitle :text="$t('pages.testing.index.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<p class="text-primary-700 dark:text-primary-100">
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia autem debitis ab
					dolorum tempore placeat possimus perferendis porro sit aut nobis quasi hic
					consequuntur, atque impedit nihil totam illo odit?
				</p>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
