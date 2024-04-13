const [provideIframeModal, useIframeModal]
  = useSingleton<(url: string) => void>()

export { provideIframeModal, useIframeModal }
