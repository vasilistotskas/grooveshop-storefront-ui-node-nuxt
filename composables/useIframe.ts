const [provideIframeModal, useIframeModal] = useSingleton<(url: string) => void>()

export { useIframeModal, provideIframeModal }
