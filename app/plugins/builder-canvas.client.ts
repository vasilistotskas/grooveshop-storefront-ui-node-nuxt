/**
 * Starts the editor's preview on a store page drawn as its canvas
 * (`useBuilderSurface`), framed by the editor: `app/builder/canvas/bridge.ts`.
 *
 * Only once the page has hydrated (`onNuxtReady`): the preview replaces what
 * the server rendered, and changing it during hydration would be a mismatch.
 * The bridge is loaded only here, so no shopper's page carries it.
 */
export default defineNuxtPlugin({
  name: 'builder-canvas',
  setup(nuxtApp) {
    if (useBuilderSurface() !== 'canvas' || window.parent === window) return
    const preview = useBuilderCanvasPreview()
    const design = resolveDesign(useTenant().value?.schemaName)
    onNuxtReady(async () => {
      const { startBuilderCanvas } = await import('~/builder/canvas/bridge')
      startBuilderCanvas(nuxtApp, preview, design)
    })
  },
})
