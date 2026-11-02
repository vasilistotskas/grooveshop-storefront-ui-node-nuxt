/** The page builder surface this page is (`app/plugins/builder-surface.ts`), or `null` for a page of the store. */
export function useBuilderSurface(): BuilderSurface | null {
  return useNuxtApp().$builderSurface
}

/**
 * What the editor's preview draws in place of the published store: its
 * working copies as `POST /api/builder/preview` answers them, set by the
 * canvas bridge (`app/utils/builderCanvasBridge.ts`) and read by the two
 * seams that draw builder content, `useBuilderPage` and `useNavigation`.
 * Always `null` outside the canvas, and on the server.
 */
export function useBuilderCanvasPreview() {
  return useState<BuilderPreviewResponse | null>(BUILDER_CANVAS_PREVIEW_STATE, () => null)
}

/**
 * The preview of the page of `pageKey`, when the canvas draws one: the
 * store's own page of that key first, then the template, as Django serves
 * a key that is both (`builder/published.py: _page_document_key`).
 */
export function builderCanvasPage(preview: BuilderPreviewResponse | null, pageKey: string): BuilderPage | undefined {
  if (!preview) return undefined
  return preview.pages[builderDocumentKey('page', pageKey)] ?? preview.pages[builderDocumentKey('template', pageKey)]
}
