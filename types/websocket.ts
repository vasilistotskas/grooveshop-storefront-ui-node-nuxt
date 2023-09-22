export type WebsocketMessageDataKind = 'error' | 'success' | 'info' | 'warning' | 'danger'
export type WebsocketMessageDataTranslation = Record<
	string,
	{
		message: string | null | undefined
	}
>

export type WebsocketMessageData = {
	users: string[]
	isRead: boolean
	link: string
	kind: WebsocketMessageDataKind
	translations: WebsocketMessageDataTranslation
}
