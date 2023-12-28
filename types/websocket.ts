export type WebsocketMessageKind = 'error' | 'success' | 'info' | 'warning' | 'danger'
export type WebsocketMessageTranslation = Record<
	string,
	{
		message: string | null | undefined
	}
>

export type WebsocketMessage = {
	users: string[]
	isRead: boolean
	link: string
	kind: WebsocketMessageKind
	translations: WebsocketMessageTranslation
}
